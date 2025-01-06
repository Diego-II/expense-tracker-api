module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'semi': ['error', 'never'],
    '@typescript-eslint/semi': ['error', 'never']
  }
} 