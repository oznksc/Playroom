package com.playroom.runtime.audio;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.math.Vector2;
import com.playroom.runtime.components.AudioListenerComponent;
import com.playroom.runtime.components.AudioSourceComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

import java.util.HashMap;
import java.util.Map;

public class AudioSystem {
    private final Map<String, Sound> soundCache = new HashMap<String, Sound>();
    private final Map<String, Long> activeSoundInstances = new HashMap<String, Long>();
    private final Vector2 listenerPos = new Vector2();
    private boolean hasListener = false;

    public void update(SceneData scene, Vector2 cameraPos) {
        // 1. Locate audio listener position (or fallback to camera)
        hasListener = false;
        for (Entity entity : scene.entities) {
            AudioListenerComponent listener = entity.getComponent(AudioListenerComponent.class);
            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (listener != null && listener.enabled && transform != null) {
                listenerPos.set(transform.x, transform.y);
                hasListener = true;
                break;
            }
        }
        if (!hasListener && cameraPos != null) {
            listenerPos.set(cameraPos);
        }

        // 2. Process audio sources
        for (Entity entity : scene.entities) {
            AudioSourceComponent source = entity.getComponent(AudioSourceComponent.class);
            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (source == null || !entity.active) continue;

            if (source.playOnStart && !activeSoundInstances.containsKey(entity.id)) {
                playSound(source.assetId, entity.id, source.volume, source.loop, transform, source.minDistance, source.maxDistance);
            }
        }
    }

    public long playSound(String assetId, String instanceKey, float baseVolume, boolean loop, TransformComponent transform, Float minDistance, Float maxDistance) {
        if (assetId == null || assetId.isEmpty()) return -1L;

        Sound sound = getSound(assetId);
        if (sound == null) return -1L;

        float volume = baseVolume;
        float pan = 0f;

        if (transform != null) {
            float dist = listenerPos.dst(transform.x, transform.y);
            float minDist = minDistance != null ? minDistance : 100f;
            float maxDist = maxDistance != null ? maxDistance : 1000f;

            if (dist > minDist) {
                float factor = 1.0f - Math.min(1.0f, (dist - minDist) / (maxDist - minDist));
                volume *= factor;
            }

            // Pan based on horizontal distance
            float deltaX = transform.x - listenerPos.x;
            pan = Math.max(-1.0f, Math.min(1.0f, deltaX / (maxDist * 0.5f)));
        }

        long soundId = loop ? sound.loop(Math.max(0f, volume)) : sound.play(Math.max(0f, volume));
        if (soundId != -1L) {
            sound.setPan(soundId, pan, Math.max(0f, volume));
            if (instanceKey != null) {
                activeSoundInstances.put(instanceKey, soundId);
            }
        }
        return soundId;
    }

    public void playSoundOneShot(String assetId, float volume) {
        if (assetId == null || assetId.isEmpty()) return;
        Sound sound = getSound(assetId);
        if (sound != null) {
            sound.play(Math.max(0f, volume));
        }
    }

    public void stopSound(String instanceKey, String assetId) {
        if (instanceKey != null && activeSoundInstances.containsKey(instanceKey)) {
            long soundId = activeSoundInstances.remove(instanceKey);
            Sound sound = getSound(assetId);
            if (sound != null) {
                sound.stop(soundId);
            }
        }
    }

    private Sound getSound(String assetId) {
        if (soundCache.containsKey(assetId)) {
            return soundCache.get(assetId);
        }

        String path = "gamekit/assets/" + assetId;
        FileHandle handle = Gdx.files.internal(path);
        if (handle.exists()) {
            try {
                Sound sound = Gdx.audio.newSound(handle);
                soundCache.put(assetId, sound);
                return sound;
            } catch (Exception e) {
                Gdx.app.error("AudioSystem", "Failed to load sound: " + assetId, e);
            }
        }
        return null;
    }

    public void dispose() {
        for (Sound sound : soundCache.values()) {
            if (sound != null) sound.dispose();
        }
        soundCache.clear();
        activeSoundInstances.clear();
    }
}
