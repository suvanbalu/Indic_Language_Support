from flask import Flask, request, jsonify
import torch
from transformers import AutoModelForSeq2SeqLM, BitsAndBytesConfig
from IndicTransTokenizer import IndicProcessor, IndicTransTokenizer
from functools import lru_cache

app = Flask(__name__)

BATCH_SIZE = 4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
quantization = None

# Function to initialize the translation model and tokenizer
def initialize_model_and_tokenizer(ckpt_dir, direction, quantization):
    if quantization == "4-bit":
        qconfig = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
    elif quantization == "8-bit":
        qconfig = BitsAndBytesConfig(
            load_in_8bit=True,
            bnb_8bit_use_double_quant=True,
            bnb_8bit_compute_dtype=torch.bfloat16,
        )
    else:
        qconfig = None

    tokenizer = IndicTransTokenizer(direction=direction)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        ckpt_dir,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        quantization_config=qconfig,
    )

    if qconfig == None:
        model = model.to(DEVICE)
        if DEVICE == "cuda":
            model.half()

    model.eval()

    return tokenizer, model

# Function for batch translation
def batch_translate(input_sentences, src_lang, tgt_lang, model, tokenizer, ip):
    translations = []
    for i in range(0, len(input_sentences), BATCH_SIZE):
        batch = input_sentences[i : i + BATCH_SIZE]

        # Preprocess the batch and extract entity mappings
        batch = ip.preprocess_batch(batch, src_lang=src_lang, tgt_lang=tgt_lang)

        # Tokenize the batch and generate input encodings
        inputs = tokenizer(
            batch,
            src=True,
            truncation=True,
            padding="longest",
            return_tensors="pt",
            return_attention_mask=True,
        ).to(DEVICE)

        # Generate translations using the model
        with torch.no_grad():
            generated_tokens = model.generate(
                **inputs,
                use_cache=True,
                min_length=0,
                max_length=256,
                num_beams=5,
                num_return_sequences=1,
            )

        # Decode the generated tokens into text
        generated_tokens = tokenizer.batch_decode(generated_tokens.detach().cpu().tolist(), src=False)

        # Postprocess the translations, including entity replacement
        translations += ip.postprocess_batch(generated_tokens, lang=tgt_lang)

        del inputs
        torch.cuda.empty_cache()

    return translations

# Initialize models for both directions
en_indic_ckpt_dir = "ai4bharat/indictrans2-en-indic-1B"
en_indic_tokenizer, en_indic_model = initialize_model_and_tokenizer(en_indic_ckpt_dir, "en-indic", quantization)

indic_en_ckpt_dir = "ai4bharat/indictrans2-indic-en-1B"
indic_en_tokenizer, indic_en_model = initialize_model_and_tokenizer(indic_en_ckpt_dir, "indic-en", "")

# @lru_cache(maxsize=128)
@app.route('/', methods=['GET'])
def home():
    return "Welcome to the translation app!"

# Route for Indic to English translation
@app.route('/translate/indic-to-english', methods=['POST'])
def indic_to_english_translation():
    data = request.json
    input_sentences = data.get('sentences', [])
    ip = IndicProcessor(inference=True)
    translations = batch_translate(input_sentences, "hin_Deva", "eng_Latn",indic_en_model, indic_en_tokenizer, ip)

    return jsonify({'translations': translations})

# Route for English to Indic translation
@app.route('/translate/english-to-indic', methods=['POST'])
def english_to_indic_translation():
    data = request.json
    input_sentences = data.get('sentences', [])
    ip = IndicProcessor(inference=True)
    translations = batch_translate(input_sentences, "eng_Latn", "hin_Deva",en_indic_model, en_indic_tokenizer, ip)

    return jsonify({'translations': translations})


# @lru_cache(maxsize=128)  # Set an appropriate cache size
# def translate_english_to_indic(sentences):
#     ip = IndicProcessor(inference=True)
#     translations = batch_translate(sentences, "eng_Latn", "hin_Deva", en_indic_model, en_indic_tokenizer, ip)
#     return translations

# @app.route('/translate/english-to-indic', methods=['POST'])
# def english_to_indic_translation():
#     data = request.json
#     input_sentences = data.get('sentences', [])

#     # Use the cached translation function
#     translations = translate_english_to_indic(tuple(input_sentences))

#     return jsonify({'translations': translations})



if __name__ == '__main__':
    app.run(port=3001)  # You can specify any port you prefer
