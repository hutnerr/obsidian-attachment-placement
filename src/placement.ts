import { Clogger } from "clogger";

export class PlacementManager {

    constructor() {
        Clogger.debug('Initializing PlacementManager...', true);
    }

    async handleNewFile(path: string): Promise<void> {
        Clogger.debug(`Handling new file: ${path}`, true);
        if (await this._isMarkdownFile(path)) 
        {
            Clogger.debug(`Markdown file. No special handling required.`, true);
        }
    }

    async _isMarkdownFile(path: string): Promise<boolean> {
        return path.endsWith('.md');
    }

}