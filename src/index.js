/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2019-09-24
* Updated at  : 2021-02-20
* Author      : jeefo
* Purpose     :
* Description :
* Reference   :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
// ignore:start
"use strict";

/* globals -open, -close*/
/* exported*/

// ignore:end

const fs              = require("fs");
const path            = require("path");
const async_wrapper   = require("@jeefo/utils/async/wrapper");
const promise_wrapper = require("@jeefo/utils/async/promise_wrapper");

function JeefoFileSystem () {}
JeefoFileSystem.prototype = Object.create(fs);
const my_fs = new JeefoFileSystem();

const {
    stat,
    symlink,
    open,
    read,
    close,
    unlink,
    readFile,
    writeFile,
    mkdir,
    rmdir,
    readdir,
} = fs;

my_fs.symlink = (target, path, type) => promise_wrapper((resolve, reject) => {
    symlink(target, path, type, err => err ? reject(err) : resolve());
});

my_fs.stat = filepath => promise_wrapper((resolve, reject) => {
    stat(filepath, (err, stats) => err ? reject(err) : resolve(stats));
});

my_fs.unlink = filepath => promise_wrapper((resolve, reject) => {
    unlink(filepath, err => {
        if (err) err.code === "ENOENT" ? resolve() : reject(err);
        else resolve();
    });
});

my_fs.open = (filepath, flags, mode) => promise_wrapper((resolve, reject) => {
    open(filepath, flags, mode, (err, file_handler) => {
        return err ? reject(err) : resolve(file_handler);
    });
});

my_fs.read = (fd, buffer, offset, length, position) => {
    return promise_wrapper((resolve, reject) => {
        read(fd, buffer, offset, length, position, (err, bytes_read) => {
            return err ? reject(err) : resolve(bytes_read);
        });
    });
};

my_fs.close = fd => promise_wrapper((resolve, reject) => {
    close(fd, err => err ? reject(err) : resolve());
});

my_fs.readFile = (fp, options = {}) => promise_wrapper((resolve, reject) => {
    readFile(
        fp, options, (err, data) => err ? reject(err) : resolve(data)
    );
});

my_fs.writeFile = (fp, data, options = {}) => promise_wrapper(
    (resolve, reject) => {
        writeFile(fp, data, options, err => err ? reject(err) : resolve());
    }
);

my_fs.load_json = async_wrapper(async filepath => {
    return JSON.parse(await my_fs.readFile(filepath, "utf8"));
});

my_fs.save_json = async_wrapper(async (filepath, data, indent = 4) => {
    data = JSON.stringify(data, null, indent);
    await my_fs.writeFile(filepath, data, "utf8");
});

my_fs.read_bytes = async_wrapper(async function (filepath, {
    buffer,
    length,
    offset   = 0,
    position = 0,
    encoding = null,
}) {
    if (! buffer) buffer = Buffer.alloc(length);
    const fd = await my_fs.open(filepath, 'r');
    const bytes_read = await my_fs.read(fd, buffer, offset, length, position);
    await my_fs.close(fd);
    if (bytes_read !== length) {
        throw new Error("Bytes read length is not matched.");
    }
    return encoding ? buffer.toString(encoding) : buffer;
});

const exists_factory = method => fp => promise_wrapper((resolve, reject) => {
    stat(fp, (err, stats) => {
        if (err) err.code === "ENOENT" ? resolve(false) : reject(err);
        else resolve(method ? stats[method]() : true);
    });
});

my_fs.exists              = exists_factory();
my_fs.is_file             = exists_factory("isFile");
my_fs.is_fifo             = exists_factory("isFIFO");
my_fs.is_socket           = exists_factory("isSocket");
my_fs.is_directory        = exists_factory("isDirectory");
my_fs.is_block_device     = exists_factory("isBlockDevice");
my_fs.is_symbolic_link    = exists_factory("isSymbolicLink");
my_fs.is_character_device = exists_factory("isCharacterDevice");

my_fs.is_dir_exists = my_fs.is_directory;

my_fs.readdir = dirpath => promise_wrapper((resolve, reject) => {
    readdir(dirpath, (err, files) => err ? reject(err) : resolve(files));
});

const _rmdir = dirpath => promise_wrapper(async (resolve, reject) => {
    try {
        const files = await my_fs.readdir(dirpath);
        for (const file of files) {
            const filepath = path.join(dirpath, file);
            if (await my_fs.is_directory(filepath)) {
                await _rmdir(filepath);
            } else {
                await my_fs.unlink(filepath);
            }
        }

        await my_fs.rmdir(dirpath);
        resolve();
    } catch (e) {
        reject(e);
    }
});

my_fs.mkdir = (dirpath, options = {}) => promise_wrapper((resolve, reject) => {
    mkdir(dirpath, options, err => err ? reject(err) : resolve());
});

my_fs.rmdir = dirpath => promise_wrapper((resolve, reject) => {
    rmdir(dirpath, err => err ? reject(err) : resolve());
});

my_fs.remove_dir = async_wrapper(async dirpath => {
    try {
        const stat = await my_fs.stat(dirpath);
        if (stat.isDirectory()) {
            await _rmdir(dirpath);
        } else {
            const error = new Error("ENOTDIR");
            error.code  = "ENOTDIR";
            throw error;
        }
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }
});

my_fs.ensure_dir = async_wrapper(async dirpath => {
    await my_fs.mkdir(dirpath, {recursive: true});
});

my_fs.remove = filepath => promise_wrapper((resolve, reject) => {
    stat(filepath, async (err, stats) => {
        if (err) err.code === "ENOENT" ? resolve() : reject(err);
        try {
            if (stats.isDirectory()) {
                await _rmdir(filepath);
            } else {
                await my_fs.unlink(filepath);
            }
            resolve();
        } catch (e) { reject(e); }
    });
});

module.exports = my_fs;
