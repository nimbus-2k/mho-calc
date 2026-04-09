# MHO Stat Calculator

Stat calculator for Marvel Heroes Omega. Game Version: 1.52.0.1700 (2.16a)

<img src="/public/preview.gif" alt="preview" height="300"/>

## How to Use

1. **Select Your Hero**
2. **Add Items and Stats** Item stats in-game are rounded to one decimal place, so they might not be exact. For better accuracy, calculate the exact stat percentages from the detailed item view (Alt view), then enter those values into the app.
3. **Allocate Infinity**
4. **Activate Synergies**
5. **Calculate Damage** The Base Damage should be without any items, buffs, talents, infinity, and synergy equipped/activated.

## Features

### Stat Calculator
- **Item/Buff/Talent Stats Management**
- **Infinity System**
- **Hero Synergy**

### Stat Display
- **Customizable Categories**
- **Select Stats to Display/Hide**
- **Expandable Sections**

### Damage Calculator (Non-Summoner)
- **Normal, Crit, Brutal Damage**
- **DMG vs [Condition]**
- **Keyword System**
- **Average Damage**

### Other
- Saves/Load builds in browser
- Export/Import builds as .json file

### Supported Stats

#### Core Stats
- **Health** (Level Scaling)
- **Spirit/Resource and Cost Reduction**
- **Base Stats from Archetype and Traits**
- **Attack Speed**
- **Move Speed**
- **Attributes** (ONLY LVL 60 Base Attributes)

#### Damage Stats
- **Base Damage** (+Traits Ex: Deadpool - Bonus Damage based on Awesome)
- **Damage Types**
- **Critical Hit/Damage**
- **[Damage Type] Critical Hit**
- **Brutal Strike/Damage**

#### Defense Stats
- **Damage Reduction**
- **Defense**
- **Deflect**
- **Dodge**
- **Health Regeneration**
- **Health On Hit**
- **Health On Kill**
- **Reduced DMG from Melee, Ranged, Area**

## To-do / Not Working

- **[Damage Type] Brutal Strike**
- **Average Effective Health**
- **Toughness Stat**
- **Traits with bonus stats**:
    - Emma Frost - Diamond Form
    - Hulk/She-hulk - Anger Scaling
    - Human Torch - Overheat
    - Storm - Tempest Surge
    - Thing - Clobberin' Time

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
git clone https://github.com/nimbus-2k/mho-calc.git
cd mho-calc
npm install
npm run dev
```

### Build
```bash
npm run build
```

## Credits

- [Alex Bond's Database Browser](https://github.com/AlexBond2/MHServerEmu)
- [Crypto137's MHDataParser](https://github.com/Crypto137/MHDataParser)
- [Lace / Wilfrid Wong](https://www.youtube.com/@WilfridWong)
- Prinn's Spreadsheet

## Disclaimer

All Marvel-related visuals and characters belong to Marvel Entertainment, LLC and Gazillion. This is a fan-made project and is not affiliated with Marvel or Gazillion.

---

*Built with ❤️ for the MHO community*