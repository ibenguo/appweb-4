/*
    Support functions for Embedthis Appweb
    Exporting: packageBinaryFiles, createLinks, startAppweb

    Copyright (c) All Rights Reserved. See copyright notice at the bottom of the file.
 */

require ejs.tar
require ejs.unix

/*
    Copy binary files to package staging area
 */
public function packageBinaryFiles(formats = ['tar', 'native']) {
    let settings = bit.settings
    let bin = bit.dir.pkg.join('bin')
    safeRemove(bit.dir.pkg)
    let vname = settings.product + '-' + settings.version + '-' + settings.buildNumber
    let pkg = bin.join(vname)
    pkg.makeDir()

    /* These three files are replicated outside the data directory */
    install('doc/product/README.TXT', pkg, {fold: true, expand: true})
    install('package/install.sh', pkg.join('install'), {permissions: 0755, expand: true})
    install('package/uninstall.sh', pkg.join('uninstall'), {permissions: 0755, expand: true})
    let contents = pkg.join('contents')

    let prefixes = bit.prefixes;
    let p = {}
    for (prefix in bit.prefixes) {
        p[prefix] = Path(contents.portable.name + bit.prefixes[prefix].removeDrive().portable)
        p[prefix].makeDir()
    }
    let strip = bit.platform.profile == 'debug'

    install('LICENSE.md', p.product, {fold: true, expand: true})
    install('doc/product/README.TXT', p.product, {fold: true, expand: true})
    install('package/uninstall.sh', p.bin.join('uninstall'), {permissions: 0755, expand: true})
    install('package/linkup', p.bin, {permissions: 0755})
    install(bit.dir.bin + '/*', p.bin, {
        include: /appweb|appman|esp|http|auth|makerom|libappweb|libmpr|setConfig/,
        permissions: 0755, 
    })
    install(bit.dir.bin.join('appweb').joinExt(bit.ext.exe), p.bin, {
        permissions: 0755, 
        strip: strip,
    })
    install(bit.dir.lib.join('*'), p.lib, {
        permissions: 0755, 
        exclude: /file-save|www|simple|sample/,
    })
    install('src/server/appweb.conf', p.config)
    install('src/server/mime.types', p.config)
    install('src/server/php.ini', p.config)
    install('src/server/web/**/*', p.web, {exclude: /mgmt/ })
    install('src/server/web/test/*', p.web.join('test'))
    install('src/server/web/test/*', p.web.join('test'), {
        include: /.cgi|test.pl|test.py/,
        permissions: 0755,
    })
    install(bit.dir.lib + '/esp.conf', p.lib)
    install(bit.dir.lib + '/esp-www', p.lib)
    let user = getWebUser(), group = getWebUser()
    p.spool.join('cache').makeDir()
    let tmp = p.spool.join('cache/.dummy')
    tmp.write()
    tmp.setAttributes({permissions: 0755, uid: user, gid: group})
    tmp = p.log.join('error.log')
    tmp.write()
    tmp.setAttributes({permissions: 0755, uid: user, gid: group})

    //  MOB - should this apply to non-openssl ?
    if (bit.packs.ssl.enable && bit.platform.os == 'linux') {
        install(bit.dir.lib.join('*.' + bit.ext.shobj + '*'), p.lib, {strip: strip, permissions: 0755})
        for each (f in p.lib.glob('*.so.*')) {
            let withver = f.basename
            let nover = withver.name.replace(/\.[0-9]*.*/, '.so')
            let link = p.lib.join(nover)
            f.remove()
            f.symlink(link.basename)
        }
    }
    let conf = Path(contents.portable + '' + bit.prefixes.config.removeDrive().portable + '/appweb.conf')
    if (bit.platform.os == 'win') {
        run(['setConfig', '--home', '.', '--documents', 'web', '--logs', 'logs', '--port', settings.http_port,
            '--ssl', settings.ssl_port, '--cache', 'cache', '--modules', 'bin', conf])
    } else {
        run(['setConfig', '--home', prefixes.config, '--documents', prefixes.web, '--logs', prefixes.log,
            '--port', settings.http_port, '--ssl', settings.ssl_port, '--user', user, '--group', group,
            '--cache', prefixes.spool.join('cache'), '--modules', prefixes.lib, conf])
    }
    bit.dir.cfg.join('appweb.conf.bak').remove()

    if (bit.packs.ejscript.enable) {
        install(bit.dir.lib.join('ejs*.mod'), p.lib);
    }
    if (OS == 'macosx') {
        let daemons = contents.join('Library/LaunchDaemons')
        daemons.makeDir()
        install('package/MACOSX/com.embedthis.appweb.plist', daemons, {permissions: 0644, expand: true})

    } else if (OS == 'linux') {
        install('package/LINUX/' + settings.product + '.init', 
            contents.join('etc/init.d', settings.product), 
            {permissions: 0755, expand: true})
        install('package/LINUX/' + settings.product + '.upstart', 
            contents.join('init', settings.product).joinExt('conf'),
            {permissions: 0644, expand: true})

    } else if (OS == 'win') {
        install(bit.packs.compiler.path.join('../../redist/x86/Microsoft.VC100.CRT/msvcr100.dll'), p.bin)
        /*
            install(bit.packs.compiler.path.join('../../lib/msvcrt.lib'), p.bin)
         */
        install(bit.dir.bin.join('removeFiles*'), bin)
        install(bit.dir.bin.join('setConf*'), bin)
    }
    if (bit.platform.like == 'posix') {
        install('doc/man/*.1', p.productver.join('doc/man/man1'), {compress: true})
    }
    p.productver.join('files.log').write(contents.glob('**', {exclude: /\/$/, relative: true}).join('\n') + '\n')
    if (formats) {
        package(bit.dir.pkg.join('bin'), formats)
    }
}

public function packageSourceFiles() {
    let s = bit.settings
    let src = bit.dir.pkg.join('src')
    let pkg = src.join(s.product + '-' + s.version)
    safeRemove(pkg)
    pkg.makeDir()
    install(['Makefile', 'product.bit'], pkg)
    install('bits', pkg)
    install('*.md', pkg, {fold: true, expand: true})
    install('configure', pkg, {permissions: 0755})
    install('src', pkg, {
        exclude: /\.log$|\.lst$|ejs.zip|\.stackdump$|\/cache|huge.txt|\.swp$|\.tmp/,
    })
    install('test', pkg, {
        exclude: /\.log$|\.lst$|ejs.zip|\.stackdump$|\/cache|huge.txt|\.swp$|\.tmp/,
    })
    install('doc', pkg, {
        exclude: /\/xml\/|\/html\/|Archive|\.mod$|\.so$|\.dylib$|\.o$/,
    })
    install('projects', pkg, {
        exclude: /\/Debug\/|\/Release\/|\.ncb|\.mode1v3|\.pbxuser/,
    })
    package(bit.dir.pkg.join('src'), 'src')
}

public function packageComboFiles() {
    let s = bit.settings
    let src = bit.dir.pkg.join('src')
    let pkg = src.join(s.product + '-' + s.version)
    safeRemove(pkg)
    pkg.makeDir()
    install('projects/buildConfig.' + bit.platform.configuration, pkg.join('src/deps/appweb/buildConfig.h'))
    install('package/appweb.bit', pkg.join('src/deps/appweb/product.bit'))
    install('package/Makefile.flat', pkg.join('src/deps/appweb/Makefile'))
    install(['src/deps/mpr/mpr.h', 'src/deps/http/http.h', 'src/appweb.h', 'src/server/appwebMonitor.h',
        'src/esp/edi.h', 'src/esp/mdb.h', 'src/esp/esp.h', 'src/deps/pcre/pcre.h'], 
        pkg.join('src/deps/appweb/appweb.h'), {
        cat: true,
        filter: /^#inc.*appweb.*$|^#inc.*mpr.*$|^#inc.*http.*$|^#inc.*customize.*$|^#inc.*edi.*$|^#inc.*mdb.*$|^#inc.*esp.*$/mg,
        title: bit.settings.title + ' Library Source',
    })
    install(['src/deps/**.c'], pkg.join('src/deps/appweb/deps.c'), {
        cat: true,
        filter: /^#inc.*appweb.*$|^#inc.*mpr.*$|^#inc.*http.*$|^#inc.*customize.*$|^#inc.*edi.*$|^#inc.*mdb.*$|^#inc.*esp.*$/mg,
        exclude: /pcre|makerom|http\.c|sqlite|manager/,
        header: '#include \"appweb.h\"',
        title: bit.settings.title + ' Library Source',
    })
    install(['src/**.c'], pkg.join('src/deps/appweb/appwebLib.c'), {
        cat: true,
        filter: /^#inc.*appweb.*$|^#inc.*mpr.*$|^#inc.*http.*$|^#inc.*customize.*$|^#inc.*edi.*$|^#inc.*mdb.*$|^#inc.*esp.*$/mg,
        exclude: /deps|server.appweb.c|esp\.c|samples|romFiles|pcre|appwebMonitor|sqlite|appman|makerom|utils|test|http\.c|sqlite|manager/,
        header: '#include \"appweb.h\"',
        title: bit.settings.title + ' Library Source',
    })
    install(['src/server/appweb.c'], pkg.join('src/deps/appweb/appweb.c'))
    install(['src/server/appweb.conf'], pkg.join('src/deps/appweb/appweb.conf'))
    install(['src/esp/esp.conf'], pkg.join('src/deps/appweb/esp.conf'))
    install(['src/deps/pcre/pcre.c', 'src/deps/pcre/pcre.h'], pkg.join('src/deps/appweb'))
    install(['src/deps/sqlite/sqlite3.c', 'src/deps/sqlite/sqlite3.h'], pkg.join('src/deps/sqlite'))
    package(bit.dir.pkg.join('src'), ['src', 'combo', 'flat'])
}

public function installBinary() {
    if (App.uid != 0) {
        throw 'Must run as root. Use \"sudo bit install\"'
    }
    packageBinaryFiles(null)
    package(bit.dir.pkg.join('bin'), 'install')
    createLinks()
    trace('Start', 'appman install enable start')
    Cmd.run('/usr/local/bin/appman install enable start')
    bit.dir.pkg.join('bin').removeAll()
    trace('Complete', bit.settings.title + ' installed')
}

public function uninstallBinary() {
    if (App.uid != 0) {
        throw 'Must run as root. Use \"sudo bit uninstall\"'
    }
    trace('Uninstall', bit.settings.title)                                                     
    let appman = Cmd.locate('appman')
    try {
        Cmd.run('appman stop disable uninstall')
    } catch {}
    let fileslog = bit.prefixes.productver.join('files.log')
    if (fileslog.exists) {
        for each (let file: Path in fileslog.readLines()) {
            vtrace('Remove', file)
            file.remove()
        }
    }
    fileslog.remove()
    for each (file in bit.prefixes.log.glob('*.log*')) {
        file.remove()
    }
    for each (prefix in bit.prefixes) {
        for each (dir in prefix.glob('**', {include: /\/$/}).sort().reverse()) {
            vtrace('Remove', dir)
            dir.remove()
        }
        vtrace('Remove', prefix)
        prefix.remove()
    }
}

/*
    Create symlinks for binaries and man pages
 */
public function createLinks() {
    let programs = ['appman', 'appweb', 'http', 'auth', 'esp']
    let localbin = Path('/usr/local/bin')
    let bin = bit.prefixes.bin
    let target: Path
    let log = []

    for each (program in programs) {
        let link = Path(localbin.join(program))
        link.symlink(bin.join(program))
        log.push(link)
    }
    for each (page in bit.prefixes.productver.join('doc/man').glob('**/*.1.gz')) {
        let link = Path('/usr/share/man/man1/' + page.basename)
        link.symlink(page)
        log.push(link)
    }
    bit.prefixes.productver.join('files.log').append(log.join('\n') + '\n')
}

public function startAppweb() {
    trace('Start', 'appman install enable start')
    Cmd.run('/usr/local/bin/appman install enable start')
}


/*
    @copy   default
  
    Copyright (c) Embedthis Software LLC, 2003-2012. All Rights Reserved.
    Copyright (c) Michael O'Brien, 1993-2012. All Rights Reserved.
  
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