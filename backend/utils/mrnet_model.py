import torch
import torch.nn as nn

class MRNet(nn.Module):
    def __init__(self):
        super(MRNet, self).__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=7, stride=3, padding=3),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=5, stride=1, padding=2),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(1)
        )
        self.fc = nn.Linear(64, 1)

    def forward(self, x):  # x shape: (slices, 1, 256, 256)
        features = []
        for i in range(x.shape[0]):
            f = self.cnn(x[i:i+1])
            features.append(f.view(-1))
        features = torch.stack(features)
        out = self.fc(features.mean(dim=0))
        return torch.sigmoid(out)

def load_mrnet_model(weights_path, device):
    model = MRNet().to(device)
    try:
        # ✅ Fix for PyTorch 2.6+ — allow loading full model weights
        state_dict = torch.load(weights_path, map_location=device, weights_only=False)
    except TypeError:
        # For older PyTorch versions that don’t support weights_only
        state_dict = torch.load(weights_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    print("✅ MRNet ACL weights loaded successfully!")
    return model

