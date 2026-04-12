
# Tabletop RPG Space Combat Management System

A local frontend prototype for managing spaceship combat in a tabletop RPG environment. Built with React, this application provides a simple interface for players to manage ship attributes and calculate combat effects.

## Features

- **Login System**: Choose nickname, role, and ship
- **Role-Based Permissions**: Different capabilities for Pilot, Copilot, and Gunner roles
- **Ship Attribute Management**: Distribute 14 points across 5 ship attributes
- **Dynamic Effect Tables**: Automatic calculation of combat effects based on attribute levels
- **Real-time Validation**: Ensures rules are followed during attribute distribution
- **Responsive Design**: Works on desktop and tablet devices

## Ships Available

- **Hawthorne III**: Balanced ship (60/80 HP)
- **Valkyrie Nova**: Heavy firepower focused (75/100 HP)
- **Orion VX**: Speed and maneuverability focused (50/70 HP)

## Roles

- **Pilot**: Can edit ship attributes
- **Copilot**: Can edit ship attributes
- **Gunner**: Read-only view of ship status

## Ship Attributes

Each ship has 14 points to distribute among:

1. **Weapons**: Increases damage output (1d8 to 2d10+6)
2. **Missiles**: Increases area damage (1d6+1 to 8d6)
3. **Controls**: Modifies accuracy and maneuverability (-25% to +25%)
4. **Shields**: Increases protection (6 to 19 points)
5. **Engines**: Increases speed and engine version (3x/VM7 to 6x/VM21)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Fersseli/spaceship.git
cd spaceship
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/           # React components
│   ├── LoginScreen.jsx
│   ├── ShipDashboard.jsx
│   ├── ShipStatusCard.jsx
│   └── AttributeControl.jsx
├── data/                # Game data and rules
│   ├── ships.js
│   └── effectTables.js
├── utils/               # Helper functions
│   ├── effectHelpers.js
│   └── rolePermissions.js
├── styles/              # Component styles
│   ├── LoginScreen.css
│   ├── ShipDashboard.css
│   ├── ShipStatusCard.css
│   └── AttributeControl.css
├── App.jsx
├── App.css
└── index.js
```

## Usage

1. **Login**: Enter your nickname, select your role (Pilot, Copilot, or Gunner), and choose your ship
2. **View Ship Status**: See your current ship's HP and health status
3. **Manage Attributes** (if role allows):
   - Use + and - buttons to adjust attribute levels
   - Effects update automatically
   - Watch remaining points display
4. **Logout**: Return to login screen at any time

## Rules Enforced

- ✅ Total points must equal 14
- ✅ Each attribute minimum: 0
- ✅ Each attribute maximum: 6
- ✅ Gunners cannot edit attributes
- ✅ Cannot exceed available points
- ✅ Real-time validation on all changes

## Future Enhancements

- Turn-based combat system
- Multiplayer functionality
- Backend database for persistence
- Real authentication system
- Damage calculation during combat
- Ship inventory management

## Development

All code comments are written in Brazilian Portuguese.

### Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

### GitHub Pages Deployment

This project is structured to be deployable on GitHub Pages:

```bash
npm run build
# Push the build/ directory to GitHub Pages
```

## License

This project is open source and available under the MIT License.

## Author

Created as a prototype for a tabletop RPG space combat management system.
