/*
    ejsHandler.c -- Ejscript language request handler for the Ejscript Web Framework.

    Copyright (c) All Rights Reserved. See details at the end of the file.
 */
/********************************** Includes **********************************/

#include    "appweb.h"

#if BLD_FEATURE_EJSCRIPT
    #include    "ejs.h"

/************************************* Data ***********************************/

static char startup[] = "\
    require ejs.web; \
    let server: HttpEndpoint = new HttpEndpoint; \
    var router = Router(Router.Top); \
    server.on('readable', function (event, request) { \
        server.serve(request, router) \
    }); \
    server.listen(); \
";

/************************************* Code ***********************************/

static void openEjs(HttpQueue *q)
{
    HttpConn    *conn;
    HttpRx      *rx;
    HttpRoute   *route;
    Ejs         *ejs;
    EjsPool     *pool;
    char        *uri;
    
    conn = q->conn;
    rx = conn->rx;
    uri = rx->pathInfo;
    route = rx->route;

    if (!conn->ejs) {
        if (!route->context) {
            if (route->script == 0) {
                route->script = sclone(startup);
            }
            if (route->workers < 0) {
                route->workers = mprGetMaxWorkers();
            }
#if UNUSED
            filename = mprGetPortablePath(alias->filename);
            poolScript = sfmt("require ejs.web; global.ejs::HttpEndpointHome = '%s'; global.ejs::HttpEndpointDocuments = '%s';",
                alias->filename, alias->filename);
#endif
            route->context = ejsCreatePool(route->workers, "require ejs.web", route->script, route->scriptPath, route->dir);
            mprLog(5, "ejs: Demand load Ejscript web framework");
        }
        //  MOB - remove conn->pool and store in ejs->pool
        pool = conn->pool = route->context;
        if ((ejs = ejsAllocPoolVM(pool, EJS_FLAG_HOSTED)) == 0) {
            httpError(conn, HTTP_CODE_SERVICE_UNAVAILABLE, "Can't create Ejs interpreter");
            return;
        }
        conn->ejs = ejs;
        ejs->hosted = 1;
    }

#if UNUSED
    /*
        Set the scriptName to the alias prefix and remove from pathInfo
     */
    if (alias->prefixLen > 0) {
        uri = &uri[alias->prefixLen];
#if UNUSED
        if (*uri != '/' && uri[-1] == '/') {
            uri--;
        }
#endif
        if (*uri == '\0') {
            uri = "/";
        }
        rx->scriptName = alias->prefix;
        rx->pathInfo = sclone(uri);
        mprLog(5, "ejs: set script name: \"%s\", pathInfo: \"%s\"", rx->scriptName, rx->pathInfo);
    }
#endif
}


/*
    EjsAlias scriptName [[path] script]]
 */
static int ejsAliasDirective(MaState *state, cchar *key, cchar *value)
{
    HttpRoute   *route;
    HttpHost    *host;
    char        *prefix, *path, *script, *workers;
    
    route = state->route;
    host = state->host;

    if (!maTokenize(state, value, "%P ?P ?S ?N", &prefix, &path, &script, &workers)) {
        return MPR_ERR_BAD_SYNTAX;
    }
#if UNUSED
    prefix = stemplate(prefix, route->tokens);
    path = httpMakePath(route, path);
#endif
    if (script) {
        script = strim(script, "\"", MPR_TRIM_BOTH);
    }
#if UNUSED
    if (httpLookupDir(host, path) == 0) {
        parent = mprGetFirstItem(host->dirs);
        dir = httpCreateDir(path, parent);
        httpAddDir(host, dir);
    }
    alias = httpCreateAlias(prefix, path, 0);
    mprLog(4, "EjsAlias \"%s\" for \"%s\"", prefix, path);
    httpAddAlias(host, alias);

    if (httpLookupLocation(host, prefix)) {
        mprError("Location already exists for \"%s\"", value);
        return MPR_ERR_BAD_SYNTAX;
    }
#endif
    route = httpCreateInheritedRoute(state->route);
    httpSetRouteScriptName(route, sjoin("/", prefix, 0));
    httpSetRouteScript(route, 0, script);
    if (workers) {
        httpSetRouteWorkers(route, atoi(workers));
    }
    httpAddRouteHandler(route, "ejsHandler", "");
    httpFinalizeRoute(route);
    return 0;
}


static int ejsStartupDirective(MaState *state, cchar *key, cchar *value)
{
    httpSetRouteScript(state->route, 0, strim(value, "\"", MPR_TRIM_BOTH));
    return 0;
}


static int ejsWorkersDirective(MaState *state, cchar *key, cchar *value)
{
    HttpStage   *stage;

    if ((stage = httpLookupStage(state->http, "ejsHandler")) == 0) {
        mprError("EjsHandler is not configured");
        return MPR_ERR_BAD_SYNTAX;
    }
    httpSetRouteWorkers(state->route, atoi(value));
    return 0;
}


int maEjsHandlerInit(Http *http, MprModule *module)
{
    HttpStage   *stage;
    MaAppweb    *appweb;

    /*
        Most of the Ejs handler is in ejsLib.c. Augment the handler with match, open and parse callbacks.
     */
    if ((stage = ejsAddWebHandler(http, module)) != 0) {
        stage->open = openEjs;
    }
    appweb = httpGetContext(http);
    maAddDirective(appweb, "EjsAlias", ejsAliasDirective);
    maAddDirective(appweb, "EjsStartup", ejsStartupDirective);
    maAddDirective(appweb, "EjsWorkers", ejsWorkersDirective);
    return 0;
}
#else /* BLD_FEATURE_EJSCRIPT */

int maEjsHandlerInit(Http *http, MprModule *module)
{
    mprNop(0);
    return 0;
}
#endif /* BLD_FEATURE_EJSCRIPT */

/*
    @copy   default
 
    Copyright (c) Embedthis Software LLC, 2003-2011. All Rights Reserved.
    Copyright (c) Michael O'Brien, 1993-2011. All Rights Reserved.

    This software is distributed under commercial and open source licenses.
    You may use the GPL open source license described below or you may acquire
    a commercial license from Embedthis Software. You agree to be fully bound
    by the terms of either license. Consult the LICENSE.TXT distributed with
    this software for full details.

    This software is open source; you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by the
    Free Software Foundation; either version 2 of the License, or (at your
    option) any later version. See the GNU General Public License for more
    details at: http://www.embedthis.com/downloads/gplLicense.html

    This program is distributed WITHOUT ANY WARRANTY; without even the
    implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

    This GPL license does NOT permit incorporating this software into
    proprietary programs. If you are unable to comply with the GPL, you must
    acquire a commercial license to use this software. Commercial licenses
    for this software and support services are available from Embedthis
    Software at http://www.embedthis.com

    Local variables:
    tab-width: 4
    c-basic-offset: 4
    End:
    vim: sw=4 ts=4 expandtab

    @end
 */