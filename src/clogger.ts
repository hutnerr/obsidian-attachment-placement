export class Clogger {
	static debugEnabled: boolean = false;
	static disabled: boolean = true;
	static useTimestamps: boolean = false;

	private static _getTimestamp(): string {
		if (Clogger.useTimestamps) {
			return `[${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} EST] `;
		}
		return "";
	}

	private static _log(
		tag: string,
		msg: string,
		consoleFn: (msg: string) => void = console.debug,
	): void {
		if (Clogger.disabled) return;

		const timestamp = Clogger._getTimestamp();
		const output = `${timestamp}${tag.padEnd(8)} | ${msg}`;

		consoleFn(output);
	}

	static log(tag: string, msg: string): void {
		if (!Clogger.debugEnabled) return;
		Clogger._log(`[${tag.toUpperCase()}]`, msg);
	}

	static error(msg: string): void {
		Clogger._log("[ERROR]", msg, console.error);
	}

	static debug(msg: string): void {
		if (!Clogger.debugEnabled) return;
		Clogger._log("[DEBUG]", msg);
	}

	static action(msg: string): void {
		if (!Clogger.debugEnabled) return;
		Clogger._log("[ACTION]", msg);
	}

	static info(msg: string): void {
		if (!Clogger.debugEnabled) return;
		Clogger._log("[INFO]", msg);
	}

	static warn(msg: string): void {
		Clogger._log("[WARN]", msg, console.warn);
	}
}
