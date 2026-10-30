"use strict";
const ChatLink = {
    GONE: "That conversation has ended, so there is nothing to open.",
    FAULT: "The conversations couldn't be read, so the link wasn't opened.",
    _latest: 0,
    async open(id) {
        const mine = ++this._latest;
        const was = Chat.isOpen();
        Chat.show();
        if (was)
            SuptPages.clear();
        if (!id)
            return false;
        await Thread.read();
        if (mine !== this._latest || !Chat.isOpen())
            return false;
        if (Thread.fault) {
            Chat.say(this.FAULT);
            return false;
        }
        const row = Thread.threads.find(t => t.id === id);
        if (row) {
            Chat.thread(row);
            return true;
        }
        Chat.say(this.GONE);
        return false;
    },
};
