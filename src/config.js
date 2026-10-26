const API_BASE_URL = (
    process.env.REACT_APP_API_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '')
).replace(/\/+$/, '');

const getApiUrl = (path) => {
    if (!API_BASE_URL) {
        throw new Error('The backend API is not configured. Set REACT_APP_API_URL in Vercel and redeploy.');
    }
    return `${API_BASE_URL}${path}`;
};

export default getApiUrl;
