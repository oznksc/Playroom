package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;
import java.util.ArrayList;
import java.util.List;

public class FollowPathComponent implements Component {
    public final List<Vector2> points = new ArrayList<>();
    public float speed = 100f;
    public boolean loop = true;
    public int currentPointIndex = 0;
    public int targetPointIndex = 0;
}
