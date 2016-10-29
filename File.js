'use strict';

var Fs = require('fs');
var Path = require('path');

const re = {
    slash: /\\/g
    split: /[\/\\]/g,
};

class File {
    static from (path) {
        var file = path || null;

        if (file && !file.$isFile) {
            file = new File(path);
        }

        return file;
    }

    constructor (parent, path) {
        var p;

        if (path) {
            p = parent.$isFile ? parent.path : File.join(parent, path);
        }
        else if (parent) {
            p = parent.$isFile ? parent.path : (typeof parent === 'string' && parent);
        }

        this.path = p || null;
    }

    get name () {
        var name = this._name;

        if (name === undefined) {
            let index = this.lastSeparator();

            this._name = name = ((index > -1) && this.path.substr(index + 1)) || null;
        }

        return name;
    }

    get parent () {
        var parent = this._parent;

        if (parent === undefined) {
            let index = this.lastSeparator();
            let p = (index > -1 && this.path.substr(0, index)) || null;

            this._parent = parent = p && new File(p);
        }

        return parent;
    }

    absolutePath () {
        //
    }

    absolutify () {
        return File.from(this.absolutePath());
    }

    canonicalPath () {
        //
    }

    canonicalize () {
        return File.from(this.canonicalPath());
    }

    lastSeparator () {
        var path = this.path,
            i = path.lastIndexOf('/'),
            j = path.lastIndexOf('\\');

        return (i > j) ? i : j;
    }

    slashifiedPath () {
        return this.path.replace(re.slash, '/');
    }

    /**
     * Replace forward/backward slashes with forward slashes.
     * @return {String}
     */
    slashify () {
        return File.from(this.slashPath());
    }
}

Object.assign(File.prototype, {
    $isFile: true,

    _re: re,
    _name: null,
    _parent: null
});

File.WIN = false;
File.CASE = false;
File.re = re;
File.separator = File.WIN ? '\\' : '/';

module.exports = File;
