"""
Export a trained SensorRacer DQN (stable-baselines3) policy
to a simple JSON weight file that can be loaded in TF.js.

This avoids needing a full ONNX/TF.js converter: we only
serialize the dense layer weights and rebuild the same
architecture manually in the browser.

Usage (after running train_dqn.py):

    python -m rl_training.export_weights_to_json

Output:
    rl_training/output/sensor_racer_dqn_weights.json
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

import numpy as np

from rl_training.train_dqn import TrainingConfig


def export_weights(cfg: TrainingConfig | None = None) -> str:
    if cfg is None:
        cfg = TrainingConfig()

    from stable_baselines3 import DQN  # type: ignore
    import torch  # type: ignore
    import torch.nn as nn  # type: ignore

    model_path = os.path.join(cfg.log_dir, f"{cfg.model_name}.zip")
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Could not find trained model at {model_path}. "
            "Run rl_training.train_dqn first."
        )

    model: DQN = DQN.load(model_path)

    # SB3 DQN policy has q_net as a torch.nn.Module (typically Sequential)
    q_net: nn.Module = model.q_net  # type: ignore[attr-defined]

    layers: List[Dict[str, Any]] = []

    for module in q_net.modules():
        if isinstance(module, nn.Linear):
            weight = module.weight.detach().cpu().numpy().astype(np.float32)
            bias = module.bias.detach().cpu().numpy().astype(np.float32)
            layer_info: Dict[str, Any] = {
                "type": "dense",
                "input_dim": int(weight.shape[1]),
                "output_dim": int(weight.shape[0]),
                "activation": "relu",  # last layer will be overridden at load time
                "weight": weight.tolist(),
                "bias": bias.tolist(),
            }
            layers.append(layer_info)

    if not layers:
        raise RuntimeError("No Linear layers found in model.q_net; check SB3 version/architecture.")

    # By convention, the last layer uses linear activation in Q-networks.
    layers[-1]["activation"] = "linear"

    payload: Dict[str, Any] = {
        "architecture": "mlp",
        "layers": layers,
        "metadata": {
            "note": "Weights exported from stable-baselines3 DQN for SensorRacer.",
            "input_dim": layers[0]["input_dim"],
            "num_actions": layers[-1]["output_dim"],
        },
    }

    out_dir = cfg.log_dir
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "sensor_racer_dqn_weights.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    print(f"[rl_training] Exported DQN weights to JSON: {out_path}")
    return out_path


if __name__ == "__main__":
    export_weights()

