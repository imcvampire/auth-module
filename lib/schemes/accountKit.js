export default class AccountKitScheme {
  constructor (auth, options) {
    this.$auth = auth
    this.name = options._name

    this.options = Object.assign({}, DEFAULTS, options)
  }

  _setToken (token) {
    if (this.options.globalToken) {
      // Set Authorization token for all axios requests
      this.$auth.ctx.app.$axios.setHeader(this.options.tokenName, token)
    }
  }

  _clearToken () {
    if (this.options.globalToken) {
      // Clear Authorization token for all axios requests
      this.$auth.ctx.app.$axios.setHeader(this.options.tokenName, false)
    }
  }

  mounted () {
    this._initAccountKit()

    const token = this.$auth.syncToken(this.name)
    this._setToken(token)

    return this.$auth.fetchUserOnce()
  }

  _initAccountKit () {
    const tag = document.createElement('script')
    tag.setAttribute(
      'src',
      `https://sdk.accountkit.com/${this.options.language}/sdk.js`
    )
    tag.setAttribute('id', 'account-kit')
    tag.setAttribute('type', 'text/javascript')
    tag.onload = () => {
      /* eslint-disable camelcase */
      window.AccountKit_OnInteractive = this.onLoad.bind(this)
      /* eslint-enable camelcase */
    }
    document.head.appendChild(tag)
  }

  async login (endpoint) {
    // Ditch any leftover local tokens before attempting to log in
    this.logout()

    const self = this

    async function callback ({ code }) {
      const result = await this.$auth.request(
        endpoint,
        this.options.serverAPI
      )

      if (this.options.tokenRequired) {
        const token = this.options.tokenType
          ? this.options.tokenType + ' ' + result
          : result

        this.$auth.setToken(this.name, token)
        self._setToken(token)
      }
    }

    window.AccountKit.login({
      method: this.options.method,
      params: this.options.params,
      callback
    })

    const result = await this.$auth.request(
      endpoint,
      this.options.endpoints.login
    )

    if (this.options.tokenRequired) {
      const token = this.options.tokenType
        ? this.options.tokenType + ' ' + result
        : result

      this.$auth.setToken(this.name, token)
      this._setToken(token)
    }

    return this.fetchUser()
  }

  async fetchUser (endpoint) {
    // User endpoint is disabled.
    if (!this.options.endpoints.user) {
      this.$auth.setUser({})
      return
    }

    // Token is required but not available
    if (!this.$auth.getToken(this.name)) {
      return
    }

    // Try to fetch user and then set
    const user = await this.$auth.requestWith(
      this.name,
      endpoint,
      this.options.endpoints.user
    )
    this.$auth.setUser(user)
  }

  logout () {
    this._clearToken()

    return this.$auth.reset()
  }
}

const DEFAULTS = {
  tokenType: 'Bearer',
  globalToken: true,
  tokenName: 'Authorization',
  method: 'PHONE',
  params: {},
  serverAPI: '',
  lang: 'en_US'
}
