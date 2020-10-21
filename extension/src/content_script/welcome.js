import React, { useState } from 'react';
import { toast } from 'react-toastify';

export function isOnInstalled() {
  return new URLSearchParams(window.location.search).get('welcome') === 'true';
}

function WelcomeMessage() {
  const [loading, setLoading] = useState(false);

  const play = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      {
        type: 'init_popup',
        data: {
          username: 'username',
          roomId: '',
          lang: 'en',
        },
      },
      () => {
        setLoading(false);
      }
    );
  };

  return (
    <div style={{ fontSize: '1.2em', cursor: 'default' }}>
      <img
        src={chrome.runtime.getURL('images/header.png')}
        style={{ width: '100%' }}
      />
      <h3>Welcome to Wikigame!</h3>
      <p>Thanks for installing Multiplayer Wikigame extension!</p>
      <p>
        Wikigame is an extension to play Wikiracing online directly on Wikipedia
        pages. You can read more about Wikiracing on this article.
      </p>
      <p>
        Click <strong>Play Now!</strong> below to start playing!
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '10px',
          paddingBottom: '10px',
        }}
      >
        <button
          onClick={play}
          style={{
            backgroundColor: '#4286f4',
            color: 'white',
            padding: '3px',
            border: 'none',
            cursor: 'pointer',
            width: '50%',
            minHeight: '32px',
          }}
        >
          {loading ? 'Loading...' : 'Play Now!'}
        </button>
      </div>
      <p>
        You can also start playing whenever you are on any Wikipedia pages by
        clicking the extension icon{' '}
        <img src={chrome.runtime.getURL('images/icon-32.png')} /> (tips: pin the
        extension for easier access!)
      </p>
    </div>
  );
}

export function onInstalled() {
  toast(() => <WelcomeMessage />, {
    autoClose: false,
    closeOnClick: false,
    position: toast.POSITION.TOP_RIGHT,
    toastId: 'welcomeInstall',
  });
}

export function onInstalledPlay() {
  const showToast = () => {
    toast(
      () => (
        <div style={{ fontSize: '1.2em', cursor: 'default' }}>
          <p>Great job!</p>
          <p>
            Your goal is to get to{' '}
            <a href="https://en.wikipedia.org/wiki/Japan">Japan</a> from{' '}
            <a href="https://en.wikipedia.org/wiki/Wikiracing">Wikiracing</a>
          </p>
          <p>
            Click <strong>Start</strong> button on the left to start whenever
            you're ready. Or you can always pick your own start/target articles,
            or even change the rules!
          </p>
          <p>Happy Wikiracing!</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px',
              paddingBottom: '10px',
            }}
          >
            <button
              onClick={() => toast.dismiss('welcomeInstallPlay')}
              style={{
                backgroundColor: '#4286f4',
                color: 'white',
                padding: '3px',
                border: 'none',
                cursor: 'pointer',
                width: '50%',
                minHeight: '32px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        position: toast.POSITION.TOP_RIGHT,
        toastId: 'welcomeInstallPlay',
      }
    );
  };

  toast.dismiss('welcomeInstall');

  chrome.runtime.sendMessage(
    {
      type: 'update',
      data: {
        currentRound: {
          start: 'Wikiracing',
          target: 'Japan',
        },
      },
    },
    () => {
      showToast();
    }
  );
}
