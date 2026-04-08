import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Auth0Provider } from '@auth0/auth0-react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <Auth0Provider
    domain="dev-n3fdwaan0yuprun4.us.auth0.com"
    clientId="e1v9Yqj93s3iY4g8bbW884r3zElKuKkU"
    cacheLocation="localstorage"
    useRefreshTokens
    authorizationParams={{
      redirect_uri: window.location.origin
    }}
  >
    <App />
  </Auth0Provider>,
)
