/*
    reuse.tst - Test Http reuse for multiple requests
 */

const HTTP = App.config.main || "127.0.0.1:4100"

let http: Http = new Http

http.get(HTTP + "/index.html")
assert(http.status == 200)

http.get(HTTP + "/index.html")
assert(http.status == 200)

http.get(HTTP + "/index.html")
assert(http.status == 200)

http.get(HTTP + "/index.html")
assert(http.status == 200)
