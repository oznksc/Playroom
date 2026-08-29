package com.playroom.runtime.components;

public class TilemapComponent implements Component {
    public String tilesetId = "";
    public int tileWidth = 32;
    public int tileHeight = 32;
    public int columns = 8;
    public int gridWidth = 10;
    public int gridHeight = 10;
    public int[] tiles = new int[0];
    public boolean solid = false;
}
