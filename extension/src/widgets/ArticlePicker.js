
import React, {useState, useEffect, useRef} from 'react';
import ReactDOM from 'react-dom';
import {getCurrentArticle, goto} from '../util';
import {getRandomPage, getAutocomplete} from '../wiki';

const clearElementChildren = function (element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

function SuggestionResultsItem(props) {
  const {article, onSelected} = props;

  const [selected, setSelected] = useState(props.selected);
  useEffect(() => {
    setSelected(props.selected);
  }, [props.selected]);

  const style = {
    color: '#000',
    margin: 0,
    lineHeight: '1.5em',
    padding: '0.01em 0.25em',
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  if (selected) {
    Object.assign(style, {
      backgroundColor: '#2a4b8d',
      color: '#fff',
    });
  }

  const onMouseOver = () => {
    setSelected(true);
  };

  const onMouseLeave = () => {
    setSelected(false);
  };

  const onClick = () => {
    console.log('onClick article:', article);
    onSelected(article);
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        cursor: 'pointer',
        border: '1px solid #a2a9b1',
        padding: 0,
        margin: 0,
      }}
      className="suggestions-results"
      onClick={onClick}
    >
      <a
        className="mw-searchSuggest-link"
        title={article}
      >
        <div
          style={style}
          onMouseOver={onMouseOver}
          onMouseLeave={onMouseLeave}
          className={selected ? 'suggestions-result suggestions-result-current' : ''}
        >
          {article}
        </div>
      </a>
    </div>
  );
}

function Autocomplete(props) {
  const {anchor, keyword, onSelected} = props;

  const [articles, setArticles] = useState([]);

  useEffect(() => {
    getAutocomplete(keyword)
      .then(articles => {
        if (!articles || !articles.length) {
          return;
        }

        console.log('Autocomplete results:', articles);

        setArticles(articles);
      })
      .catch(err => {
        console.warn('Error fetching autocomplete:', err);
      });
  }, [keyword]);

  if (!anchor) {
    return null;
  }

  if (!articles.length) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: '#ffffff',
        display: 'block',
        height: 'auto',
        lineHeight: 'auto',
        width: anchor.clientWidth,
        fontSize: '13px',
        top: anchor.offsetTop + anchor.offsetHeight,
        bottom: 'auto',
        left: anchor.offsetLeft,
        right: 'auto',
      }}
      class="suggestions"
    >
      <div
        style={{
          backgroundColor: '#fff',
          cursor: 'pointer',
          border: '1px solid #a2a9b1',
          padding: 0,
          margin: 0,
        }}
        className="suggestions-result"
      >
        {
          articles.map(article => (
            <SuggestionResultsItem
              article={article}
              onSelected={onSelected}
            />
          ))
        }
      </div>
    </div>
  );
}

export function ArticlePicker(props) {
  const {onChange, disabled, placeholder} = props;

  const [value, setValue] = useState(props.value);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // on props updated
  useEffect(() => {
    console.log('ArticlePicker props.value change:', props.value);
    setValue(props.value);
    setShowAutocomplete(false);
  }, [props.value]);

  const ref = useRef(null);

  const onEdit = newValue => {
    setValue(newValue);
    setShowAutocomplete(newValue.length > 0);
  };

  const onChangeToCurrent = () => {
    if (disabled) return;

    onChange(getCurrentArticle());
  };

  const onChangeToRandom = () => {
    if (disabled) return;

    setValue('Loading...');
    getRandomPage()
      .then(title => {
        setValue(title);
        onChange(title);
      })
      .catch(err => {
        console.error('onChangeToRandom error:', err);
      });
  };

  const onAutocompleteSelected = article => {
    setValue(article);
    setShowAutocomplete(false);
    onChange(article);
  };

  const onBlur = () => {
    // Ugly hacks to get around autocomplete onclick racing with this onblur.
    // So now we disallow free input and only accept input from autocomplete.
    setTimeout(() => {
      setShowAutocomplete(false);
    }, 500);
  };

  const view = () => {
    // trust props.value than state.value
    if (!props.value) return;

    goto(props.value);
  };

  return (
    <div class='wikigame-article-picker'>
      <input
        ref={ref}
        type='text'
        placeholder={placeholder || 'Pick an article'}
        disabled={disabled}
        value={value}
        title={value}
        onChange={e => onEdit(e.target.value)}
        onBlur={onBlur}
      />
      <div>
        <a style={{fontSize: '0.75em'}} onClick={onChangeToCurrent} disabled={disabled}>current</a>
        {' | '}
        <a style={{fontSize: '0.75em'}} onClick={onChangeToRandom} disabled={disabled}>random</a>
        {' | '}
        <a style={{fontSize: '0.75em'}} disabled={!!props.value} onClick={view}>view</a>
      </div>
      {
        showAutocomplete
          ? (
            <Autocomplete
              anchor={ref && ref.current}
              keyword={value}
              onSelected={onAutocompleteSelected}
            />
          ) : null
      }
    </div>
  );
}
