import { getLogger } from '@logtape/logtape';

export class DeskLogger {
    static getLogger() {
        return getLogger([ 'desk' ])
    }
}