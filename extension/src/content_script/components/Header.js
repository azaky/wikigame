import React from 'react';
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';
import { getCurrentArticle, getLink, getLinkWithRoomId } from '../util';

export function Header(props) {
  const { roomId } = props;

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
      chrome.runtime.sendMessage({ type: 'leave' }, () => {
        toast('You successfully left the room. See you again!');
        setTimeout(() => {
          // reload but remove roomId
          window.location.href = getLink(getCurrentArticle());
        }, 1000);
      });
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
          Room: <b>{roomId}</b>
          &nbsp;
          <a onClick={onShareClick}>(share)</a>
          &nbsp;
          <a onClick={onLeaveClick}>(leave)</a>
        </span>
      </h3>
    </nav>
  );
}
