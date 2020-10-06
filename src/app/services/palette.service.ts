import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaletteService {
  private readonly NBR_COLORS = 13;
  // readonly colors = [
  //   '#5f6368',
  //   '#5c2b29',
  //   '#614a19',
  //   '#635d19',
  //   '#345920',
  //   '#16504b',
  //   '#2d555e',
  //   '#1e3a5f',
  //   '#42275e',
  //   '#5b2245',
  //   '#442f19',
  //   '#3c3f43',
  // ];

  getRandomColor(): number {
    return Math.floor(Math.random() * this.NBR_COLORS);
  }
}
