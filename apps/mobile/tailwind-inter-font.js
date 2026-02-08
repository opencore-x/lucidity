const plugin = require('tailwindcss/plugin');
const fonts = require('./lib/fonts.config');

const fontPlugin = plugin(function ({ addUtilities }) {
  addUtilities({
    '.font-normal': {
      fontFamily: fonts.regular,
      fontWeight: '400',
    },
    '.font-medium': {
      fontFamily: fonts.medium,
      fontWeight: '500',
    },
    '.font-semibold': {
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    '.font-bold': {
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    '.font-extrabold': {
      fontFamily: fonts.extrabold,
      fontWeight: '800',
    },
  });
});

module.exports = fontPlugin;
