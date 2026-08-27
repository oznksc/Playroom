package com.playroom.runtime.android;

import android.os.Bundle;
import com.badlogic.gdx.backends.android.AndroidApplication;
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration;
import com.badlogic.gdx.utils.JsonReader;
import com.badlogic.gdx.utils.JsonValue;
import com.playroom.runtime.GameKitGame;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class AndroidLauncher extends AndroidApplication {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AndroidApplicationConfiguration config = new AndroidApplicationConfiguration();
        config.useImmersiveMode = true;
        PlayGamesServicesV2 services = new PlayGamesServicesV2(this);
        loadGameServices(services);
        initialize(new GameKitGame(services), config);
    }

    private void loadGameServices(PlayGamesServicesV2 services) {
        try (InputStream in = getAssets().open("gamekit/project.json");
             InputStreamReader reader = new InputStreamReader(in, StandardCharsets.UTF_8)) {
            JsonValue root = new JsonReader().parse(reader);
            if (root != null && root.has("gameServices")) {
                JsonValue gs = root.get("gameServices");
                if (gs.has("achievements")) {
                    for (JsonValue ach = gs.get("achievements").child; ach != null; ach = ach.next) {
                        String id = ach.getString("id", null);
                        if (id != null && ach.has("providers")) {
                            JsonValue providers = ach.get("providers");
                            String googlePlayId = providers.getString("googlePlay", null);
                            if (googlePlayId != null && !googlePlayId.isEmpty()) {
                                services.registerAchievement(id, googlePlayId);
                            }
                        }
                    }
                }
                if (gs.has("leaderboards")) {
                    for (JsonValue lb = gs.get("leaderboards").child; lb != null; lb = lb.next) {
                        String id = lb.getString("id", null);
                        if (id != null && lb.has("providers")) {
                            JsonValue providers = lb.get("providers");
                            String googlePlayId = providers.getString("googlePlay", null);
                            if (googlePlayId != null && !googlePlayId.isEmpty()) {
                                services.registerLeaderboard(id, googlePlayId);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Gracefully ignore if project.json does not have game services or is not yet loaded
        }
    }
}
