import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { Wrapper, Header, CurrentRoundOverview, Rules } from './components';
import * as util from './util';

export function InGamePanel(props) {
  const {data} = props;
  const {currentState, currentRound, rules, username, roomId} = data;

  // enforce rules
  useEffect(() => {
    if (currentState.finished) return;

    const hiddenElements = [
      'simpleSearch', // search bar
      'ca-viewsource', // View Source
      'ca-edit', // Edit
      'ca-history', // View History
    ];
    hiddenElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
      }
    });

    // ctrl+f
    let handleCtrlf;
    if (typeof rules.allowCtrlf === 'boolean' && !rules.allowCtrlf) {
      handleCtrlf = e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          toast.error('Oops, Ctrl+F is not allowed!', {toastId: 'ctrlf'});
        }
      }
      window.addEventListener('keydown', handleCtrlf);
    }

    return () => {
      // restore hidden elements
      hiddenElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = 'block';
        }
      });

      if (handleCtrlf) {
        window.removeEventListener('keydown', handleCtrlf);
      }
    };
  }, [currentState.finished]);

  // override a.click
  useEffect(() => {
    if (currentState.finished) return;

    const clickHandler = function (e) {
      if (e.target.tagName !== 'A') return;

      const link = e.target.href;
      if (!link) return;

      const articleObj = util.getArticleFromUrl(link);
      const { article } = articleObj;

      // anchor links
      if (article === util.getCurrentArticle()) {
        console.log(`Anchor link, doesn't count as a click:`, link);
        return;
      }

      e.preventDefault();

      // non-wiki links
      if (!article) {
        toast.error(`You cannot go outside Wikipedia!`);
        console.log('Ignoring invalid links:', link);
        return;
      }

      // special links
      if (util.isSpecialArticle(article)) {
        toast.error(`It's a special Wikipedia link, you cannot go there!`);
        console.log('Ignoring special links:', link);
        return;
      }

      console.log('Navigating to:', article);

      chrome.storage.local.get(['localState'], ({localState}) => {
        if (localState === 'clicking') {
          console.log(`Ignoring clicks, there's another ongoing clicking event`);
          return;
        }
        chrome.storage.local.set({localState: 'clicking'}, () => {
          util.goto(article);
        });
      });
    };

    document.addEventListener('click', clickHandler);

    return () => {
      if (clickHandler) {
        document.removeEventListener('click', clickHandler);
      }
    };
  }, [currentState.finished]);

  return (
    <Wrapper>
      <Header username={username} roomId={roomId} />
      <CurrentRoundOverview
        round={currentRound}
        currentState={currentState}
      />
      <Rules
        rules={rules}
        disabled={true}
        roundStarted={true}
      />
    </Wrapper>
  );
}
