import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { Wrapper, Header, CurrentRoundOverview, Rules } from './components';
import * as util from './util';
import { useData } from './DataContext';

export function InGamePanel() {
  const { currentState, currentRound, rules } = useData();

  // enforce rules
  useEffect(() => {
    if (currentState.finished) return;

    const hiddenElements = [
      'simpleSearch', // search bar
      'ca-viewsource', // View Source
      'ca-edit', // Edit
      'ca-history', // View History
    ];
    hiddenElements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
      }
    });

    // ctrl+f
    let handleCtrlf;
    if (typeof rules.allowCtrlf === 'boolean' && !rules.allowCtrlf) {
      handleCtrlf = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          toast.error('Oops, Ctrl+F is not allowed!', { toastId: 'ctrlf' });
        }
      };
      window.addEventListener('keydown', handleCtrlf);
    }

    // hide popups
    let popupObserver;
    if (
      typeof rules.showArticlePreview === 'boolean' &&
      !rules.showArticlePreview
    ) {
      popupObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (
                node.tagName === 'DIV' &&
                node.classList.contains('mwe-popups')
              ) {
                node.remove();
              }
            });
          }
        });
      });
      popupObserver.observe(document.body, { childList: true });
    }

    return () => {
      // restore hidden elements
      hiddenElements.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = 'block';
        }
      });

      if (handleCtrlf) {
        window.removeEventListener('keydown', handleCtrlf);
      }

      if (popupObserver) {
        popupObserver.disconnect();
      }
    };
  }, [currentState.finished]);

  // override a.click
  useEffect(() => {
    if (currentState.finished) return;

    const createClickHandler = (link, nav) => {
      return (e) => {
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

        // navigation pages
        if (nav && !rules.allowNav && typeof rules.allowNav === 'boolean') {
          toast.error(`You are not allowed to click navigational links!`);
          console.log('Ignoring navigational link:', link);
          return;
        }

        console.log('Navigating to:', article);

        chrome.storage.local.get(['localState'], ({ localState }) => {
          if (localState === 'clicking') {
            console.log(
              `Ignoring clicks, there's another ongoing clicking event`
            );
            return;
          }
          chrome.storage.local.set({ localState: 'clicking' }, () => {
            util.goto(article);
          });
        });
      };
    };

    const isNav = (el) => !!el.closest('.navbox');

    const links = [...document.getElementsByTagName('A')];
    const clickHandlers = links.map((link) =>
      createClickHandler(link.href, isNav(link))
    );
    links.forEach((link, i) =>
      link.addEventListener('click', clickHandlers[i])
    );

    // prevent clicks on newly created links
    let globalClickHandler = (e) => {
      if (e.target.tagName === 'A') e.preventDefault();
    };
    document.addEventListener('click', globalClickHandler);

    return () => {
      links.forEach((link, i) =>
        link.removeEventListener('click', clickHandlers[i])
      );
      if (globalClickHandler) {
        document.removeEventListener('click', globalClickHandler);
      }
    };
  }, [currentState.finished]);

  return (
    <Wrapper>
      <Header />
      <CurrentRoundOverview round={currentRound} currentState={currentState} />
      <Rules rules={rules} disabled={true} roundStarted={true} />
    </Wrapper>
  );
}
