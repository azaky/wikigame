import React from 'react';
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';
import {
  getCurrentArticle,
  getLang,
  getLink,
  getLinkWithRoomId,
} from '../util';
import languages from '../../lang.json';
import { useLang } from '../DataContext';

export function Header(props) {
  const { roomId } = props;

  const lang = useLang();
  const langObj = languages.find((lg) => lg.lang === lang);
  const humanizedLang = langObj.labelLocal;
  const englishLang = langObj.label;

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
      // the response will be handled in message listener in ../index.js
      chrome.runtime.sendMessage({ type: 'leave' });
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
      <h3>
        <span>
          Room:&nbsp;<b>{roomId}</b>
        </span>
        <br />
        <span>
          Language:&nbsp;
          <b title={englishLang}>
            {humanizedLang} ({lang})
          </b>
        </span>
        <br />
        <span>
          <a onClick={onShareClick}>(share)</a>
          &nbsp;
          <a onClick={onLeaveClick}>(leave)</a>
        </span>
      </h3>
    </nav>
  );
}
