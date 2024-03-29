// helper functions

const API_PATH = (() => {
    if (globalThis.window && window.location) {
        // browser
        return window.location.origin
    } else {
        // node
        console.log(process.argv)
        return process.argv[2]
    }
})()

const makeParams = (params) => (params ? Object.entries(params).reduce((value, entry, i) => value + `${i ? "&" : ""}${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`, "?") : "")
const api = (method, path, params, headers, body) => fetch(API_PATH + path + makeParams(params), {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : null
    })
    .then(
        response => {
            console.log(response)
            if (response.status >= 200 && response.status < 299) {
                return response.json()
            }
            throw new Error(`${response.status} ${response.statusText}`)
        },
        error => { throw error }
    )
export const apiPost = (path, body) => api("POST", path, null, null, body)
export const apiGet = (path, params) => api("GET", path, params, null, null)
