type Plot = (x: number, y: number, color: string) => void;

const hex = (color: string): [number, number, number] => {
  const n = color.startsWith("#") ? color.slice(1) : color;
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

function makeCanvas(w: number, h: number, draw: (plot: Plot) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  const plot: Plot = (x, y, color) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = hex(color);
    const i = (y * w + x) * 4;
    image.data[i] = r;
    image.data[i + 1] = g;
    image.data[i + 2] = b;
    image.data[i + 3] = 255;
  };
  draw(plot);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function rect(plot: Plot, x: number, y: number, w: number, h: number, color: string): void {
  for (let iy = 0; iy < h; iy += 1) {
    for (let ix = 0; ix < w; ix += 1) plot(x + ix, y + iy, color);
  }
}

function stamp(plot: Plot, rows: string[], palette: Record<string, string>, ox = 0, oy = 0): void {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color) plot(ox + x, oy + y, color);
    });
  });
}

export function aircraftSprite(kind: "regional_jet" | "narrowbody", body: string, stripe: string): HTMLCanvasElement {
  const palette = { B: body, S: stripe, W: "#d6dde8", N: "#1b2430", C: "#7ec8ff", R: "#ff3355", G: "#3ee0a0", K: "#0d1118" };
  if (kind === "regional_jet") {
    return makeCanvas(29, 37, (plot) => {
      stamp(
        plot,
        [
          ".............C.............",
          "............BBB............",
          "...........BBBBB...........",
          "..........BBBSBBB..........",
          "..........BBBSBBB..........",
          "....WW....BBBSBBB....WW....",
          "..WWWWWW..BBBSBBB..WWWWWW..",
          "WWWWWWWWWWBBBSBBBWWWWWWWWWW",
          "..N.WWWWWWBBBSBBBWWWWWW.N..",
          "......WWWWBBBSBBBWWWW......",
          "..........BBBSBBB..........",
          "..........BBBSBBB..........",
          "..........BBBBBBB..........",
          "...........BBBBB...........",
          "...........BBKBB...........",
          "..........WWWWW...........",
          ".........W..K..W..........",
          "........W...K...W.........",
        ],
        palette,
        0,
        2,
      );
      plot(2, 10, "R");
      plot(26, 10, "G");
    });
  }
  return makeCanvas(37, 49, (plot) => {
    stamp(
      plot,
      [
        ".................C...............",
        "...............BBBBB.............",
        "..............BBBBBBB............",
        ".............BBBBSBBBB...........",
        ".............BBBBSBBBB...........",
        ".............BBBBSBBBB...........",
        "......WW.....BBBBSBBBB.....WW....",
        "....WWWWWW...BBBBSBBBB...WWWWWW..",
        "..WWWWWWWWWWWBBBBSBBBBWWWWWWWWWW.",
        "WWWWWWWWWWWWWBBBBSBBBBWWWWWWWWWWW",
        "..N..WWWWWWWWBBBBSBBBBWWWWWWWW.N.",
        ".......WWWWWWBBBBSBBBBWWWWWW.....",
        ".............BBBBSBBBB...........",
        ".............BBBBSBBBB...........",
        ".............BBBBBBBBB...........",
        "..............BBBBBBB............",
        "..............BBBKBKB............",
        ".............WWWWWWWWW...........",
        "...........WW....K....WW.........",
        ".........WW......K......WW.......",
      ],
      palette,
      2,
      4,
    );
    plot(3, 16, "R");
    plot(33, 16, "G");
  });
}

export function vehicleSprite(type: string, color: string): HTMLCanvasElement {
  const cab = "#1f2933";
  const glass = "#9ad1ff";
  if (type === "fuel_truck") {
    return makeCanvas(15, 23, (plot) => {
      rect(plot, 3, 1, 9, 7, cab);
      rect(plot, 4, 2, 7, 3, glass);
      rect(plot, 2, 8, 11, 13, color);
      rect(plot, 4, 10, 7, 9, "#f7e27a");
      rect(plot, 1, 19, 3, 3, "#111");
      rect(plot, 11, 19, 3, 3, "#111");
    });
  }
  if (type === "belt_loader") {
    return makeCanvas(13, 21, (plot) => {
      rect(plot, 2, 8, 9, 11, color);
      rect(plot, 1, 17, 3, 3, "#111");
      rect(plot, 9, 17, 3, 3, "#111");
      rect(plot, 4, 1, 5, 12, "#2b2b2b");
      rect(plot, 5, 2, 3, 10, "#f39c12");
    });
  }
  if (type === "baggage_tractor") {
    return makeCanvas(13, 25, (plot) => {
      rect(plot, 3, 1, 7, 8, color);
      rect(plot, 4, 2, 5, 3, glass);
      rect(plot, 2, 10, 9, 12, "#3d2b1f");
      rect(plot, 3, 12, 3, 3, "#8e44ad");
      rect(plot, 7, 15, 3, 3, "#2980b9");
      rect(plot, 4, 18, 3, 3, "#16a085");
      rect(plot, 1, 21, 3, 3, "#111");
      rect(plot, 9, 21, 3, 3, "#111");
    });
  }
  if (type === "cleaning_van") {
    return makeCanvas(15, 21, (plot) => {
      rect(plot, 2, 1, 11, 17, color);
      rect(plot, 3, 3, 9, 5, glass);
      rect(plot, 4, 10, 7, 5, "#ecf0f1");
      rect(plot, 1, 16, 3, 4, "#111");
      rect(plot, 11, 16, 3, 4, "#111");
    });
  }
  return makeCanvas(15, 17, (plot) => {
    rect(plot, 2, 3, 11, 11, color);
    rect(plot, 4, 5, 7, 4, cab);
    rect(plot, 6, 1, 3, 3, "#111");
    rect(plot, 1, 13, 4, 3, "#111");
    rect(plot, 10, 13, 4, 3, "#111");
  });
}

export function bagSprite(color: string): HTMLCanvasElement {
  return makeCanvas(5, 4, (plot) => {
    rect(plot, 0, 0, 5, 4, color);
    rect(plot, 1, 1, 3, 1, "#0d1118");
  });
}

export const BAG_COLORS = ["#8e44ad", "#2980b9", "#16a085", "#c0392b", "#f1c40f"];
