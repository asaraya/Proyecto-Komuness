import {useState, useCallback, useEffect} from 'react';

const TextAreaComponent = ({limit, value = '', onChange, name, ...props}) => {
  const [content, setContent] = useState(value?.slice(0, limit));

  useEffect(() => {
    setContent(value.slice(0, limit));
  }, [value, limit]);
  
  const handleChange = useCallback(
    (e) => {
      const text = e.target.value;
      setContent(text.slice(0, limit));
      onChange({
	...e,
	target: {
 	  ...e.target,
	  name,
	  value: text,
	},
      });
    },
    [limit, onChange, name]
  );

  return (
    <>
      <textarea
        {...props}
	value = {content}
	maxLength={limit}
        onChange={handleChange}
      />
      <p>{content.length}/{limit}</p>
    </>
  );
}; 

export default TextAreaComponent;
