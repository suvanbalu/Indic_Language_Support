import React, { createContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { EN_INDIC, OCR_URL } from '../api';
import axios from 'axios';
import { Outlet } from 'react-router-dom';

export const SearchTextContext = createContext();

const Header = () => {
  const navigate = useNavigate();

  const searchItems = ['Mobiles', 'Laptops', 'Earphones', 'Smartwatches', 'Cameras', 'Gaming Consoles', 'Televisions', 'Footwear', 'Stationery']

  const indicLanguages = {
    // "English",
    // "हिन्दी", // Hindi
    // "বাংলা", // Bengali
    // "मराठी", // Marathi
    // "தமிழ்", // Tamil
    // "తెలుగు", // Telugu
    // "ગુજરાતી", // Gujarati
    // "ಕನ್ನಡ", // Kannada
    // "മലയാളം", // Malayalam
    // "ਪੰਜਾਬੀ", // Punjabi
    // "ଓଡ଼ିଆ", // Odia
    // "اردو", // Urdu
    // "සිංහල", // Sinhala
    // "नेपाली", // Nepali
    // "मैथिली", // Maithili
    // "संस्कृतम्" // Sanskrit
    "English": "eng_Latn",
    "हिन्दी": "hin_Deva",
    "தமிழ்": "tam_Taml",
    "తెలుగు": "tel_Telu",
    "ಕನ್ನಡ": "kan_Knda",
  };
  const [currentLang, setCurrentLang] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterVal, setFilterVal] = useState('');

  const translate = async () => {
    document.querySelectorAll('[tkey]').forEach(async (element) => {
      const key = element.getAttribute('tkey');
      const value = element.innerHTML;

      await axios.post(EN_INDIC, { sentences: [value], tgt_lang: indicLanguages[currentLang] })
        .then((response) => {
          element.innerHTML = response.data.translations[0];
        })
        .catch((error) => {
          console.error(error);
        });
    });
  };

  useEffect(() => {
    if (currentLang === 'English' || currentLang === '') {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 25000);

    translate();
  }, [currentLang]);

  const [searchText, setSearchText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (event) => {
    setUploading(true);
    setFile(event.target.files[0]);

    try {
      console.log(event.target.files[0])
      const formData = new FormData();
      formData.append('file', event.target.files[0]);

      const response = await axios.post(OCR_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log(response);
      setSearchText(response.data.resp);
      setUploading(false);
    } catch (error) {
      setErrorMessage('Error extracting text: ' + error.message);
      console.log('Error extracting text: ' + error.message)
      setUploading(false);
    }
  };


  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);

  const startListening = () => {

    const recognition = new window.webkitSpeechRecognition(); // for Chrome
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('Listening...');
      setListening(true);
    };

    recognition.onresult = event => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setTranscript(finalTranscript);
      console.log('Transcript:', finalTranscript);
      setSearchText(finalTranscript);
    };

    recognition.onend = () => {
      console.log('Stopped listening');
      setListening(false);
    };

    recognition.onerror = event => {
      console.error('Speech recognition error detected: ', event.error);
    };

    recognition.start();
  };

  let recording = false;
  useEffect(() => {
    console.log(recording);
  }, [recording]);

  return (
    <div className="flex flex-col gap-8 bg-slate-300 py-16 w-screen min-h-screen">
      <SearchTextContext.Provider
        value={{ searchText, loading, filterVal }}
      >
        <div className='flex flex-row gap-2 w-full px-20 relative'>
          <button
            className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl px-20 py-4 min-w-fit h-fit border-2 border-gray-200 text-left"
            onClick={() => {
              navigate('/');
            }}
          >
            <h1 className="text-3xl font-semibold font-poppins" tkey='title'>Build For</h1>
            <h1 className="text-3xl font-semibold font-poppins" tkey='title2'>Bharat</h1>
            <img src="/assets/shopping-cart.webp" alt="Shopping Cart" className="absolute -top-[50%] -left-[20%] w-40" />
          </button>

          {loading && (
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-xl px-4 py-2 w-fit border-2 border-gray-200 flex flex-row gap-1 text-sm font-light fixed top-4 left-[48%]">
              <span class="relative flex h-3 w-3 mt-1 mr-1">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
              <p>Translating...</p>
            </div>
          )}

          <div className='flex flex-col gap-2 w-[80%]'>
            <div className='flex flex-row gap-2 w-full'>
              <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-2 w-[60%] h-16 border-2 border-gray-200 flex flex-row gap-4">
                <img src="/assets/search-icon.webp" alt="Search Icon" className='w-10' />
                <input type="text" placeholder="Search" className="bg-transparent border-none w-full focus:outline-none" tkey='Search' value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
                {
                  searchText !== '' && (
                    <button
                      onClick={() => setSearchText('')}
                    >
                      <img src="/assets/close.webp" alt="Close Icon" className='w-10' />
                    </button>
                  )
                }
              </div>
              <button
                className={`bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-2 w-fit h-16 border-2 ${listening ? 'border-green-500 animate-pulse' : 'border-gray-200'}`}
                // onClick={recording ? stopRecording : startRecording}
                onClick={listening ? () => { } : startListening}
              >
                <img src="/assets/mic.webp" alt="Mic Icon" className='w-10' />
              </button>
              <div className='relative'>
                <label htmlFor="file-input">
                  <input
                    id="file-input"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-2 w-fit h-16 border-2 border-gray-200 cursor-pointer">
                    <img src="/assets/camera2.png" alt="Camera Icon" className='w-10' />
                  </div>
                </label>
                {uploading && (
                  <div className={`bg-white bg-opacity-20 backdrop-blur-lg rounded-xl px-4 py-2 w-fit border-2 ${errorMessage === '' ? 'border-gray-200' : 'border-red-500'} absolute bottom-[115%] -left-[25%] flex flex-row gap-1 z-20 text-sm font-light`}>
                    <span class="relative flex h-3 w-3 mt-1 mr-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                    {uploading && <p>Uploading </p>}
                    {file && <p className='whitespace-nowrap'>{file.name}</p>}
                  </div>
                )}
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-2 w-fit h-16 border-2 border-gray-200 flex flex-row gap-2">
                <img src="/assets/translate.webp" alt="Translate Icon" className='w-10' />
                <select
                  className="w-24 bg-transparent border-none leading-tight focus:outline-none"
                  value={currentLang}
                  onChange={(event) => {
                    setCurrentLang(event.target.value);
                  }}
                >
                  {Object.keys(indicLanguages)?.map((language, index) => (
                    <option key={index} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-2 w-fit h-16 border-2 border-gray-200 flex items-center"
                onClick={() => {
                  navigate('/profile');
                }}
              >
                <img src="/assets/profile.webp" alt="Profile Icon" className='w-8 mx-1' />
              </button>
            </div>

            <div className='flex flex-row gap-2 w-full overflow-auto no-scrollbar'>
              {loading && <div className="flex flex-row gap-2 w-full">
                {
                  Array(10).fill().map((_, index) => (
                    <div key={index} className="bg-gray-400 backdrop-blur-lg rounded-lg px-4 py-2 animate-pulse h-8 w-32" />
                  ))
                }
              </div>}
              {
                searchItems.map((item, index) => (
                  <SearchItem key={index} item={item} valueState={[filterVal, setFilterVal]} />
                ))
              }
            </div>
          </div>
        </div>
        <Outlet />
      </SearchTextContext.Provider>
    </div>
  )
}

const SearchItem = ({ item, valueState }) => {
  const [filterVal, setFilterVal] = valueState;

  return (
    <button
      onClick={() => {
        if (filterVal === item) {
          setFilterVal('');
        } else {
          setFilterVal(item);
        }
      }}
      className={`bg-white bg-opacity-10 backdrop-blur-lg rounded-lg px-4 py-2 whitespace-nowrap flex flex-row gap-2 items-center border-2 border-white border-opacity-10 ${filterVal === item && 'pr-8 border-gray-100 border-opacity-100 bg-opacity-30'}`} tkey={item}>
      {filterVal === item && <img
        src="/assets/close.webp" alt="Close Icon"
        className="h-5 -ml-2" />}
      {item}
    </button>
  )
}

export default Header