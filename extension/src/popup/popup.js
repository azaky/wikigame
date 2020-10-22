import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import copy from 'copy-to-clipboard';

import languages from '../lang.json';

function LanguagePicker(props) {
  const { lang, onChange } = props;

  const languagesOptions = languages
    .map(({ lang, label, labelLocal }) => ({
      label: `${label} - ${labelLocal}`,
      value: lang,
    }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <div>
      <Select
        id="lang"
        cacheOptions
        options={languagesOptions}
        onChange={({ value }) => onChange(value)}
        isClearable={true}
        value={languagesOptions.find((opt) => lang === opt.value)}
        placeholder="Pick a language ..."
        styles={{
          container: (provided) => ({
            ...provided,
            minHeight: '1px',
            // fontSize: '0.8em',
          }),
          control: (provided) => ({
            ...provided,
            minHeight: '1px',
            borderRadius: 0,
            cursor: 'text',
            padding: 0,
          }),
          input: (provided) => ({
            ...provided,
            minHeight: '1px',
          }),
          clearIndicator: (provided) => ({
            ...provided,
            paddingTop: 0,
            paddingBottom: 0,
            minHeight: '1px',
            cursor: 'pointer',
          }),
          valueContainer: (provided) => ({
            ...provided,
            minHeight: '1px',
            height: '32px',
            paddingTop: '0',
            paddingBottom: '0',
          }),
          singleValue: (provided) => ({
            ...provided,
            minHeight: '1px',
            paddingBottom: '0px',
          }),
        }}
      />
      <label>
        (articles count:{' '}
        {languages.find((lg) => lg.lang === lang).articleCount.toLocaleString()}
        )
      </label>
    </div>
  );
}

function Form(props) {
  console.log('Form root');
  const [username, setUsername] = useState(props.username);
  const [roomId, setRoomId] = useState('');
  const [lang, setLang] = useState(props.pageLang);
  const [showRoomId, setShowRoomId] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const usernameRef = useRef(null);
  const roomIdRef = useRef(null);

  useEffect(() => {
    usernameRef.current.focus();
  }, []);
  useEffect(() => {
    if (showRoomId) {
      roomIdRef.current.focus();
    }
  }, [showRoomId]);

  const onUsernameChange = (value) => {
    setUsername(value);
    chrome.storage.local.set({ username: value });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    console.log('onSubmit', username, roomId, lang);
    if (username !== '') {
      setLoading(true);
      chrome.runtime.sendMessage(
        {
          type: 'init_popup',
          data: { username, roomId, lang },
        },
        ({ success, error }) => {
          setLoading(false);
          if (!success) {
            setErrorMessage(error);
          } else {
            window.close();
          }
        }
      );
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div class="form-group">
        <label for="username">
          <strong>Username</strong>
        </label>
        <input
          ref={usernameRef}
          type="text"
          placeholder="Enter Username"
          id="username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          required
        />
      </div>
      <div class="form-group">
        <label for="lang">
          <strong>Language</strong>
        </label>
        <LanguagePicker lang={lang} onChange={setLang} />
      </div>
      {showRoomId ? (
        <div class="form-group">
          <label for="roomId">
            <strong>Room Name</strong>
          </label>
          <input
            ref={roomIdRef}
            type="text"
            placeholder="Enter Room Name"
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>
      ) : null}
      <a onClick={() => setShowRoomId(!showRoomId)}>
        {showRoomId ? 'Do not create custom room' : 'Create custom room'}
      </a>
      <button type="submit" style={{ marginTop: '10px' }}>
        <strong>{loading ? 'Loading...' : 'Play Now!'}</strong>
      </button>
      {errorMessage ? <label>{errorMessage}</label> : null}
    </form>
  );
}

function Info(props) {
  const { host, username, lang, roomId, url, state } = props;

  const [copying, setCopying] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [newLang, setNewLang] = useState(props.lang);

  const leave = () => {
    chrome.runtime.sendMessage({ type: 'leave' }, () => {
      window.close();
    });
  };

  const copyRoomUrl = () => {
    copy(url, {
      format: 'text/plain',
      onCopy: () => {
        if (!copying) {
          setCopying(true);
          setTimeout(() => {
            setCopying(false);
          }, 2000);
        }
      },
    });
  };

  const onChangeLang = () => {
    if (host !== username || newLang === lang) return;

    chrome.runtime.sendMessage(
      { type: 'change_lang', data: { lang: newLang } },
      () => {
        setShowLanguagePicker(false);
        setTimeout(() => init(), 1000);
      }
    );
  };

  return (
    <div>
      <p>
        Hello, <strong>{username}</strong>!
      </p>
      <p>
        You are currently playing in room <strong>{roomId}</strong> in language{' '}
        <strong>{languages.find((lg) => lg.lang === lang).label}</strong>
        &nbsp;
        {host === username && state === 'lobby' ? (
          <a onClick={() => setShowLanguagePicker(true)}>(change)</a>
        ) : null}
      </p>
      {showLanguagePicker ? (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <LanguagePicker lang={newLang} onChange={(l) => setNewLang(l)} />
          </div>
          <button
            type="button"
            onClick={onChangeLang}
            disabled={newLang === lang}
          >
            <strong>Change Language</strong>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={copyRoomUrl}
        style={{ marginBottom: '10px' }}
      >
        <strong>{copying ? 'Room Link Copied!' : 'Copy Room Link'}</strong>
      </button>
      <button type="button" onClick={leave}>
        <strong>Leave Room</strong>
      </button>
    </div>
  );
}

function init() {
  chrome.storage.local.get(
    ['pageLang', 'state', 'roomId', 'lang', 'username', 'host', 'url'],
    (data) => {
      console.log('init', data);
      if (data.state) {
        ReactDOM.render(
          <Info {...data} />,
          document.getElementById('container')
        );
      } else {
        ReactDOM.render(
          <Form {...data} />,
          document.getElementById('container')
        );
      }
    }
  );
}

const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);

    init();
  }
}, 10);
