/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2019-09-24
* Updated at  : 2020-10-22
* Author      : jeefo
* Purpose     :
* Description :
* Reference   :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
// ignore:start
"use strict";

/* globals*/
/* exported*/

// ignore:end

const fs              = require("fs");
const path            = require("path");
const async_wrapper   = require("@jeefo/utils/async/wrapper");
const promise_wrapper = require("@jeefo/utils/async/promise_wrapper");

function JeefoFileSystem () {}
JeefoFileSystem.prototype = Object.create(fs);
const my_fs = new JeefoFileSystem();

my_fs.stat = filepath => promise_wrapper((resolve, reject) => {
    fs.stat(filepath, (err, stats) => err ? reject(err) : resolve(stats));
});

my_fs.rmdir = dirname => promise_wrapper((resolve, reject) => {
    fs.rmdir(dirname, err => err ? reject(err) : resolve());
});

my_fs.unlink = filepath => promise_wrapper((resolve, reject) => {
    fs.unlink(filepath, err => {
        if (err) err.code === "ENOENT" ? resolve() : reject(err);
        else resolve();
    });
});

my_fs.open = (filepath, flags, mode) => promise_wrapper((resolve, reject) => {
    fs.open(filepath, flags, mode, (err, file_handler) => {
        return err ? reject(err) : resolve(file_handler);
    });
});

my_fs.read = (fd, buffer, offset, length, position) => {
    return promise_wrapper((resolve, reject) => {
        fs.read(fd, buffer, offset, length, position, (err, bytes_read) => {
            return err ? reject(err) : resolve(bytes_read);
        });
    });
};

my_fs.close = fd => promise_wrapper((resolve, reject) => {
    fs.close(fd, err => err ? reject(err) : resolve());
});

my_fs.readdir = dirname => promise_wrapper((resolve, reject) => {
    fs.readdir(dirname, (err, files) => err ? reject(err) : resolve(files));
});

my_fs.readFile = (filepath, options) => promise_wrapper((resolve, reject) => {
    fs.readFile(
        filepath, options,
        (err, data) => err ? reject(err) : resolve(data)
    );
});

my_fs.writeFile = (fp, data, options) => promise_wrapper((resolve, reject) => {
    fs.writeFile(
        fp, data, options,
        (err, data) => err ? reject(err) : resolve(data)
    );
});

my_fs.load_json = async filepath =>
    JSON.parse(await my_fs.readFile(filepath, "utf8"));

my_fs.save_json = async (filepath, data) => {
    data = JSON.stringify(data, null, 4);
    return promise_wrapper((resolve, reject) => {
        fs.writeFile(
            filepath, data, "utf8",
            err => err ? reject(err) : resolve()
        );
    });
};

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

my_fs.ensure_dir = dirname => promise_wrapper((resolve, reject) => {
    fs.mkdir(
        dirname,
        {recursive: true},
        err => err ? reject(err) : resolve()
    );
});

const exists_factory = method => fp => promise_wrapper((resolve, reject) => {
    fs.stat(fp, (err, stats) => {
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

const _rmdir = dirname => promise_wrapper((resolve, reject) => {
    fs.readdir(dirname, async function _rmdir (err, files) {
        if (err) return reject(err);

        try {
            for (const file of files) {
                const filepath = path.join(dirname, file);
                if (await my_fs.is_directory(filepath)) {
                    await _rmdir(filepath);
                } else {
                    await my_fs.unlink(filepath);
                }
            }

            await my_fs.rmdir(dirname);
        } catch (e) {
            err = e;
        } finally {
            return err ? reject(err) : resolve();
        }
    });
});

my_fs.remove_dir = async_wrapper(async dirname => {
    if (await my_fs.exists(dirname)) return _rmdir(dirname);
});

my_fs.remove = filepath => promise_wrapper((resolve, reject) => {
    fs.stat(filepath, async (err, stats) => {
        if (err) return err.code === "ENOENT" ? resolve() : reject(err);
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
