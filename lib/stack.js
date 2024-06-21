/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
class Stack {
    constructor() {
        this.errors = [];
        this.finished = 0;
        this.results = [];
        this.total = 0;
    }
    add(fn) {
        const self = this;
        const index = self.total;

        self.total++;

        return function(err, ...args) {
            if (err) { self.errors[index] = err; }

            self.finished++;
            self.results[index] = fn(...args);
            self.test();
        };
    }

    test() {
        if (this.finished >= this.total && this.callback) {
            this.callback.call(null, this.errors.length ? this.errors : null,
                this.results, this.data);
        }
    }

    done(callback, data) {
        this.callback = callback;
        this.data = data;
        this.test();
    }
}


exports.Stack = Stack;
