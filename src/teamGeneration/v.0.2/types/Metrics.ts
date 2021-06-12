import { Player } from '../models/Player';
import { Team } from '../models/Team';

export type Metrics = {
    average: number,
    median: number,
    combined: number,
    highest: Player | Team,
    lowest: Player | Team
}