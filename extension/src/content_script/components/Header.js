import React, { useState } from 'react';
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';
import { getLinkWithRoomId, leaveGame } from '../util';
import languages from '../../../../scripts/languages/lang.json';
import { useData } from '../DataContext';
import { LanguagePicker } from './LanguagePicker';

export function Header() {
  const { lang, roomId, mode, isHost, state } = useData();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const langObj = languages.find((lg) => lg.lang === lang);
  const humanizedLang = langObj.labelLocal;
  const englishLang = langObj.label;

  const onChangeLang = (newLang) => {
    setShowLanguagePicker(false);
    if (!isHost || state !== 'lobby') return;

    chrome.runtime.sendMessage({
      type: 'change_lang',
      data: { lang: newLang },
    });
  };

  const onShareClick = () => {
    copy(getLinkWithRoomId('Main_Page'), {
      format: 'text/plain',
      onCopy: () => {
        toast('Room link copied to clipboard!');
      },
    });
  };

  const onLeaveClick = () => {
    const confirmed = window.confirm(
      'Are you sure you want to leave Wikigame?'
    );
    if (confirmed) {
      leaveGame();
    }
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <div role="banner" style={{ paddingTop: '20px' }}>
        <img
          src={chrome.runtime.getURL('images/header.png')}
          style={{ width: '100%' }}
        />
      </div>
      <div
        style={{
          marginTop: '1em',
          marginLeft: '0.666667em',
          fontSize: '0.75em',
        }}
      >
        <a onClick={onLeaveClick}>(leave game)</a>
      </div>
      <h3>
        {mode === 'single' ? null : (
          <>
            <span>
              Room:&nbsp;<b>{roomId}</b> <a onClick={onShareClick}>(share)</a>
            </span>
            <br />
          </>
        )}
        <span>
          Language:{' '}
          <b title={englishLang}>
            {humanizedLang} ({lang})
          </b>{' '}
          {isHost && state === 'lobby' ? (
            <a onClick={() => setShowLanguagePicker(!showLanguagePicker)}>
              {showLanguagePicker ? '(cancel)' : '(change)'}
            </a>
          ) : null}
        </span>
      </h3>
      {showLanguagePicker ? (
        <div class="body vector-menu-content" style={{ paddingTop: '10px' }}>
          <LanguagePicker lang={lang} onChange={onChangeLang} />
        </div>
      ) : null}
    </nav>
  );
}
