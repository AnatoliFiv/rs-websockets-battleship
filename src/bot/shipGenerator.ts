import type { Ship, ShipType } from '../types/index.js';
import { BOARD_SIZE, CELL_DIRECTIONS } from '../constants/index.js';

const SHIP_TYPES: ReadonlyArray<{ type: ShipType; length: number; count: number }> = [
  { type: 'huge', length: 4, count: 1 },
  { type: 'large', length: 3, count: 2 },
  { type: 'medium', length: 2, count: 3 },
  { type: 'small', length: 1, count: 4 },
] as const;

export class BotShipGenerator {
  static generateShips(): Ship[] {
    const ships: Ship[] = [];
    const occupied = new Set<string>();
    const maxAttempts = 1000;

    for (const shipType of SHIP_TYPES) {
      for (let i = 0; i < shipType.count; i++) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < maxAttempts) {
          const ship = this.generateRandomShip(shipType.type, shipType.length);
          if (this.canPlaceShip(ship, occupied)) {
            this.placeShip(ship, occupied);
            ships.push(ship);
            placed = true;
          }
          attempts++;
        }

        if (!placed) {
          throw new Error(`Failed to place ${shipType.type} ship after ${maxAttempts} attempts`);
        }
      }
    }

    return ships;
  }

  private static generateRandomShip(type: ShipType, length: number): Ship {
    const direction = Math.random() < 0.5;
    const maxX = direction ? BOARD_SIZE - 1 : BOARD_SIZE - length;
    const maxY = direction ? BOARD_SIZE - length : BOARD_SIZE - 1;

    return {
      position: {
        x: Math.floor(Math.random() * (maxX + 1)),
        y: Math.floor(Math.random() * (maxY + 1)),
      },
      direction,
      length,
      type,
    };
  }

  private static canPlaceShip(ship: Ship, occupied: Set<string>): boolean {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;

      if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;

      const key = `${x},${y}`;
      if (occupied.has(key)) return false;

      for (const [dx, dy] of CELL_DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          const neighborKey = `${nx},${ny}`;
          if (occupied.has(neighborKey)) return false;
        }
      }
    }

    return true;
  }

  private static placeShip(ship: Ship, occupied: Set<string>): void {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      occupied.add(`${x},${y}`);
    }
  }
}
