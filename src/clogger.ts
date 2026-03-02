import { Notice } from "obsidian";

export class Clogger {
    static debugEnabled: boolean = false;
    static disabled: boolean = false;
    static disableNotifications: boolean = false;
    static useTimestamps: boolean = false;
    static noticeTimeout: number = 7500;

    private static _getTimestamp(): string {
        if (Clogger.useTimestamps) {
            return `[${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} EST] `;
        }
        return "";
    }

    private static _log(tag: string, msg: string, alert: boolean = false): void {
        if (Clogger.disabled) return;

        const timestamp = Clogger._getTimestamp();
        const output = `${timestamp}${tag.padEnd(8)} | ${msg}`;

        console.log(output);

        if (alert && !Clogger.disableNotifications) {
            new Notice(output, Clogger.noticeTimeout);
        }
    }

    static oap(msg: string, alert: boolean = false): void {
        Clogger._log("[OAP]", msg, alert);
    }

    static log(tag: string, msg: string, alert: boolean = false): void {
        Clogger._log(`[${tag.toUpperCase()}]`, msg, alert);
    }

    static error(msg: string, alert: boolean = false): void {
        Clogger._log("[ERROR]", msg, alert);
    }

    static debug(msg: string, alert: boolean = false): void {
        if (Clogger.debugEnabled) {
            Clogger._log("[DEBUG]", msg, alert);
        }
    }

    static action(msg: string, alert: boolean = false): void {
        Clogger._log("[ACTION]", msg, alert);
    }

    static info(msg: string, alert: boolean = false): void {
        Clogger._log("[INFO]", msg, alert);
    }

    static warn(msg: string, alert: boolean = false): void {
        Clogger._log("[WARN]", msg, alert);
    }
}