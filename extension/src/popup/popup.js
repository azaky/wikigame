import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';

import languages from '../lang.json';

function Form(props) {
  const [username, setUsername] = useState(props.username);
  const [roomId, setRoomId] = useState('');
  const [lang, setLang] = useState(props.pageLang);
  const [showRoomId, setShowRoomId] = useState(false);

  const usernameRef = useRef(null);
  const roomIdRef = useRef(null);

  const languagesOptions = languages
    .map(({ lang, label }) => ({
      label,
      value: lang,
    }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  useEffect(() => {
    usernameRef.current.focus();
  }, []);
  useEffect(() => {
    if (showRoomId) {
      roomIdRef.current.focus();
    }
  }, [showRoomId]);

  const onSubmit = () => {
    console.log('onSubmit', username, roomId, lang);
    if (username !== '') {
      chrome.runtime.sendMessage(
        {
          type: 'init_popup',
          data: { username, roomId, lang },
        },
        () => window.close()
      );
    }
  };

  const onChangeLang = ({ value }) => {
    console.log('setLang', value);
    setLang(value);
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
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div class="form-group">
        <label for="lang">
          <strong>Language</strong>
        </label>
        <Select
          id="lang"
          cacheOptions
          options={languagesOptions}
          onChange={onChangeLang}
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
          {languages
            .find((lg) => lg.lang === lang)
            .articleCount.toLocaleString()}
          )
        </label>
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
      <a
        onClick={() => setShowRoomId(!showRoomId)}
        style={{ cursor: 'pointer' }}
      >
        {showRoomId ? 'Do not create custom room' : 'Create custom room'}
      </a>
      <button type="submit" style={{ marginTop: '10px' }}>
        <strong>Play Now!</strong>
      </button>
    </form>
  );
}

function Info(props) {
  const { username, roomId, lang } = props;

  const leave = () => {
    chrome.runtime.sendMessage({ type: 'leave' }, () => {
      window.close();
    });
  };

  return (
    <div>
      <p>
        Hello, <strong>{username}</strong>!
      </p>
      <p>
        You are currently playing in room <strong>{roomId}</strong> (language:{' '}
        <strong>{languages.find((lg) => lg.lang === lang).label}</strong>)
      </p>
      <button type="button" onClick={leave}>
        <strong>Leave Room</strong>
      </button>
    </div>
  );
}

const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);

    chrome.storage.local.get(
      ['pageLang', 'state', 'roomId', 'lang', 'username'],
      (data) => {
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
}, 10);
