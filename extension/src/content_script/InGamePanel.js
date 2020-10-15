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

    // remove search bar
    document.getElementById('simpleSearch').remove();

    // ctrl+f
    if (typeof rules.allowCtrlf === 'boolean' && !rules.allowCtrlf) {
      window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          toast.error('Oops, Ctrl+F is not allowed!', {toastId: 'ctrlf'});
        }
      });
    }
  }, [currentState.finished]);

  // override a.click
  useEffect(() => {
    const links = document.getElementsByTagName('a');
    if (currentState.finished) return;

    for (let i = 0; i < links.length; i++) {
      links[i].onclick = (function (target) {
        return function (e) {
          const link = target.href;
          console.log('Clicking:', link);

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
            console.log('Ignoring invalid links:', link);
            return;
          }

          // special links
          if (util.isSpecialArticle(article)) {
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
      }(links[i]));
    }
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
