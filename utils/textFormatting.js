const textFormatting = (text, code) => {
  let formattedText = '';
  let formattedCode = '';

  if (text) {
    formattedText = text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  if (code) {
    formattedCode = code.toUpperCase();
  }

  return { formattedText, formattedCode };
};

module.exports = textFormatting;
