/* PBS/Web 4.2 – Personen: Mitarbeitende, Bewerber, Namen, Neukunden-Profile */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;

  D.ROLES = {
    rm: { label: 'Relationship manager', short: 'RM', market: 230000, cap: 'clients' },
    comp: { label: 'Compliance officer', short: 'Compliance', market: 160000, cap: 'alerts' },
    ops: { label: 'Operations / back office', short: 'Operations', market: 95000, cap: 'transactions' },
    it: { label: 'IT / systems', short: 'IT', market: 130000, cap: 'security' },
    pm: { label: 'Portfolio manager', short: 'Portfolio mgmt', market: 210000, cap: 'aum' },
    teller: { label: 'Cash desk teller', short: 'Cash desk', market: 85000, cap: 'visits' },
    courier: { label: 'Courier (special services)', short: 'Courier', market: 90000, cap: 'runs' },
    fin: { label: 'Finance & controlling', short: 'Finance', market: 140000, cap: '' }
  };

  // Personalbestand. desk: Länder, die ein RM betreut
  D.STAFF = [
    { id: 'S01', name: 'Urs Keller', role: 'rm', title: 'Director, desk Germany/Benelux', desk: ['DE', 'AT', 'NL', 'CH', 'SE'], skill: 4, integrity: 4, morale: 72, salary: 260000, hired: '1985-04-01' },
    { id: 'S02', name: 'Claudio Moretti', role: 'rm', title: 'Vice director, desk Italy', desk: ['IT'], skill: 4, integrity: 3, morale: 66, salary: 240000, hired: '1994-09-01' },
    { id: 'S03', name: 'Jean-Pierre Favre', role: 'rm', title: 'Vice director, desk France/Levant', desk: ['FR', 'LB', 'AE'], skill: 3, integrity: 4, morale: 70, salary: 215000, hired: '1990-02-01' },
    { id: 'S04', name: 'Thomas Hollis', role: 'rm', title: 'Vice director, desk Anglo/Shipping', desk: ['US', 'GB', 'GR', 'BR'], skill: 3, integrity: 3, morale: 61, salary: 230000, hired: '1996-05-01' },
    { id: 'S05', name: 'Dr. Reto Sprecher', role: 'rm', title: 'Director, desk Emerging markets', desk: ['RU', 'VE', 'KZ', 'NG', 'AR'], skill: 4, integrity: 2, morale: 68, salary: 290000, hired: '1997-06-01' },
    { id: 'S06', name: 'Dr. Iris Wyss', role: 'comp', title: 'Head Legal & Compliance', skill: 4, integrity: 5, morale: 70, salary: 235000, hired: '1996-01-01' },
    { id: 'S07', name: 'Marco Brunner', role: 'comp', title: 'Compliance officer', skill: 2, integrity: 4, morale: 60, salary: 120000, hired: '1997-03-01' },
    { id: 'S08', name: 'Rolf Gisler', role: 'ops', title: 'Head Operations', skill: 4, integrity: 4, morale: 68, salary: 145000, hired: '1979-08-01' },
    { id: 'S09', name: 'Sandra Baumann', role: 'ops', title: 'Payments clerk', skill: 3, integrity: 3, morale: 62, salary: 86000, hired: '1993-10-01' },
    { id: 'S10', name: 'Patrick Studer', role: 'it', title: 'Systems administrator', skill: 3, integrity: 2, morale: 52, salary: 125000, hired: '1995-07-01' },
    { id: 'S11', name: 'Dr. Martin Frei', role: 'pm', title: 'Head Portfolio Management', skill: 3, integrity: 4, morale: 66, salary: 210000, hired: '1992-11-01' },
    { id: 'S12', name: 'Hanspeter Zwicky', role: 'teller', title: 'Teller', skill: 3, integrity: 4, morale: 70, salary: 82000, hired: '1981-03-01' },
    { id: 'S13', name: 'Beatrice Lüthi', role: 'fin', title: 'Head Finance & Controlling', skill: 4, integrity: 5, morale: 69, salary: 150000, hired: '1988-06-01' }
  ];

  D.PARTNERS = { senior: 'Dr. Albert Vogt', second: 'Dr. Heinrich Lienhard' };

  D.CH_NAMES = {
    m: ['Andreas', 'Beat', 'Christian', 'Daniel', 'Felix', 'Lukas', 'Markus', 'Matthias', 'Pascal', 'Philipp', 'Reto', 'Roger', 'Stefan', 'Thomas', 'Urs', 'Marcel', 'Adrian', 'Simon'],
    f: ['Barbara', 'Claudia', 'Corinne', 'Daniela', 'Esther', 'Karin', 'Monika', 'Nicole', 'Regula', 'Sandra', 'Silvia', 'Ursula', 'Franziska'],
    l: ['Ammann', 'Bachmann', 'Baumgartner', 'Bühler', 'Egli', 'Frey', 'Gerber', 'Graf', 'Hofer', 'Huber', 'Kälin', 'Kunz', 'Lehmann', 'Meier', 'Moser', 'Müller', 'Schmid', 'Schneider', 'Steiner', 'Suter', 'Wenger', 'Widmer', 'Zbinden', 'Zürcher', 'Rochat', 'Bernasconi']
  };
  D.COMPETITORS = ['Banque Léman Privée', 'Zürcher Gewerbebank', 'Rheintaler Privatbank', 'Banca Privata Monte Generoso', 'Bankhaus Escher & Söhne', 'Banque Dufresne & Cie', 'Privatbank am Paradeplatz'];

  D.NAMES = {
    DE: { m: ['Klaus', 'Wolfgang', 'Jürgen', 'Dieter', 'Manfred', 'Gerhard', 'Helmut', 'Bernd', 'Rainer', 'Hartmut', 'Stefan', 'Michael'], f: ['Ingrid', 'Sabine', 'Renate', 'Ute', 'Gisela', 'Monika', 'Petra', 'Andrea'], l: ['Schäfer', 'Wagner', 'Hoffmann', 'Krämer', 'Lindner', 'Brandt', 'Seidel', 'Hartmann', 'Kessler', 'Dorn', 'Ostermann', 'Reinhardt', 'Burkhardt'], mr: 'Herr', mrs: 'Frau' },
    IT: { m: ['Giorgio', 'Roberto', 'Massimo', 'Franco', 'Paolo', 'Enrico', 'Alberto', 'Gianni', 'Marco', 'Sergio', 'Luca', 'Andrea'], f: ['Luciana', 'Silvana', 'Paola', 'Graziella', 'Francesca', 'Chiara'], l: ['Colombo', 'Bianchi', 'Galli', 'Rinaldi', 'Fontana', 'Ferrara', 'Bassi', 'Testa', 'Marchi', 'Lombardi', 'Rizzi', 'Galbiati'], mr: 'Sig.', mrs: 'Sig.ra' },
    FR: { m: ['Jean-Claude', 'Philippe', 'Bernard', 'Michel', 'Thierry', 'Alain', 'Gérard', 'Nicolas', 'Julien'], f: ['Christine', 'Anne-Marie', 'Dominique', 'Monique', 'Sophie', 'Camille'], l: ['Lefèvre', 'Girard', 'Bonnet', 'Mercier', 'Faure', 'Chevalier', 'Garnier', 'Lambert', 'Roussel'], mr: 'M.', mrs: 'Mme' },
    US: { m: ['Robert', 'William', 'Steven', 'Gary', 'Michael', 'Douglas', 'Kenneth', 'Scott'], f: ['Linda', 'Barbara', 'Patricia', 'Carol', 'Jennifer'], l: ['Caldwell', 'Hensley', 'Pruitt', 'Whitaker', 'Donovan', 'Brennan', 'Holloway', 'Sutton', 'Merrick'], mr: 'Mr', mrs: 'Mrs' },
    GB: { m: ['Charles', 'Rupert', 'Simon', 'Julian', 'Graham', 'Alistair', 'Edward'], f: ['Fiona', 'Penelope', 'Harriet', 'Victoria'], l: ['Pembroke', 'Hargreaves', 'Fairfax', 'Thornton', 'Kingsley', 'Ashworth', 'Merriweather'], mr: 'Mr', mrs: 'Mrs' },
    RU: { m: ['Dmitri', 'Sergei', 'Oleg', 'Andrei', 'Viktor', 'Yuri'], f: ['Yelena', 'Irina', 'Natalia'], l: ['Volkov', 'Sokolov', 'Morozov', 'Kuznetsov', 'Orlov', 'Belov'], mr: 'Mr', mrs: 'Mrs' },
    AR: { m: ['Martín', 'Diego', 'Alejandro', 'Ricardo', 'Horacio'], f: ['Graciela', 'Silvia'], l: ['Ferreyra', 'Pereyra', 'Sosa', 'Acosta', 'Medina', 'Ledesma'], mr: 'Sr.', mrs: 'Sra.' },
    BR: { m: ['João', 'Paulo', 'Ricardo', 'Fernando', 'Marcelo'], f: ['Ana', 'Beatriz', 'Luciana'], l: ['Almeida', 'Carvalho', 'Ribeiro', 'Teixeira', 'Moraes', 'Barbosa'], mr: 'Sr.', mrs: 'Sra.' },
    GR: { m: ['Nikos', 'Yannis', 'Kostas', 'Dimitris', 'Stavros'], f: ['Eleni', 'Maria'], l: ['Papadakis', 'Georgiou', 'Vlachos', 'Antonopoulos', 'Karras'], mr: 'Mr', mrs: 'Mrs' },
    KZ: { m: ['Nurlan', 'Yerlan', 'Askar', 'Bolat'], f: ['Aigul'], l: ['Seitkali', 'Dzhaksybekov', 'Abenov', 'Tulegenov'], mr: 'Mr', mrs: 'Mrs' },
    NG: { m: ['Emeka', 'Babatunde', 'Musa', 'Chinedu'], f: ['Ngozi'], l: ['Okonkwo', 'Adeyemi', 'Abubakar', 'Eze'], mr: 'Chief', mrs: 'Mrs' },
    VE: { m: ['Luis', 'Rafael', 'Jesús', 'Ernesto'], f: ['Carmen'], l: ['Mendoza', 'Rangel', 'Páez', 'Urdaneta'], mr: 'Sr.', mrs: 'Sra.' },
    LB: { m: ['Fouad', 'Karim', 'Walid', 'Nabil'], f: ['Rania', 'Nadia'], l: ['Haddad', 'Khoury', 'Saad', 'Nassar'], mr: 'Mr', mrs: 'Mrs' },
    AE: { m: ['Khalid', 'Omar', 'Saeed'], f: ['Mariam'], l: ['Al Mansouri', 'Al Falasi', 'Al Suwaidi'], mr: 'Mr', mrs: 'Mrs' }
  };

  D.TRAITS = {
    loyal: 'Loyal – has banked with the house for decades',
    nervous: 'Nervous – reads the newspapers closely',
    greedy: 'Performance-driven – compares returns',
    demanding: 'Demanding – expects personal service',
    secretive: 'Extremely discreet – no paper, no telephone'
  };

  D.PROSPECTS = [
    { c: 'DE', w: [1.5e6, 30e6], fee: [0.009, 0.013], risk: 'Normal', cash: 0.3, weight: 3,
      cities: ['München', 'Stuttgart', 'Düsseldorf', 'Hamburg', 'Frankfurt am Main', 'Freiburg im Breisgau'],
      occ: ['Dentist (own practice)', 'Car dealership owner', 'Surgeon', 'Owner, Mittelstand manufacturer', 'Real estate developer', 'Notary'],
      sow: ['Professional income', 'Business income', 'Inheritance', 'Sale of company'],
      intro: ['Steuerberater Dr. K. in Konstanz', 'Treuhand Kreuzlingen AG', 'existing client EDELWEISS'], refuseA: 0.08 },
    { c: 'IT', w: [0.8e6, 25e6], fee: [0.011, 0.016], risk: 'Normal', cash: 0.65, weight: 3,
      cities: ['Milano', 'Como', 'Bergamo', 'Brescia', 'Verona', 'Torino', 'Varese'],
      occ: ['Textile manufacturer', 'Furniture exporter', 'Construction entrepreneur', 'Restaurant chain owner', 'Steel stockholder', 'Jeweller'],
      sow: ['Business income', 'Family wealth', 'Sale of company'],
      intro: ['Fiduciaria Monte Brè SA, Lugano', 'Avv. Pellandini, Chiasso', 'existing client MONTEROSA'], refuseA: 0.25 },
    { c: 'FR', w: [1e6, 20e6], fee: [0.010, 0.014], risk: 'Normal', cash: 0.3, weight: 2,
      cities: ['Paris', 'Lyon', 'Nice', 'Strasbourg', 'Bordeaux', 'Annecy'],
      occ: ['Wine estate owner', 'Art dealer', 'Pharmacist', 'Heir to industrial family', 'Cardiologist'],
      sow: ['Inheritance', 'Business income', 'Sale of art collection'],
      intro: ['Maître R., notaire à Annecy', 'Fiduciaire Rhône SA, Genève', 'existing client LAFAYETTE'], refuseA: 0.1 },
    { c: 'US', w: [3e6, 50e6], fee: [0.010, 0.014], risk: 'Normal', cash: 0.04, weight: 2,
      cities: ['Miami, Florida', 'Houston, Texas', 'Los Angeles, California', 'Palm Beach, Florida', 'New York'],
      occ: ['Real estate investor', 'Orthodontist', 'Hedge fund partner', 'Car dealer', 'Owner, construction company'],
      sow: ['Business income', 'Real estate gains', 'Investment income'],
      intro: ['an attorney in Miami', 'existing client BLUEGRASS', 'a wealth adviser in New York'], refuseA: 0.05 },
    { c: 'GB', w: [2e6, 25e6], fee: [0.010, 0.013], risk: 'Normal', cash: 0.05, weight: 1.5,
      cities: ['London', 'Manchester', 'Edinburgh', 'Guildford'],
      occ: ['Property developer', 'Barrister', 'Owner, retail chain', 'Racehorse owner'],
      sow: ['Business income', 'Inheritance', 'Real estate gains'],
      intro: ['a solicitor in Jersey', 'existing client KESTREL'], refuseA: 0.05 },
    { c: 'RU', w: [10e6, 120e6], fee: [0.014, 0.020], risk: 'Increased', cash: 0, weight: 1, offshore: true,
      cities: ['Moscow', 'St. Petersburg', 'Yekaterinburg'],
      occ: ['Oil products trader', 'Metals trading', 'Telecoms investor'],
      sow: ['Trading profits', 'Privatisation proceeds'],
      intro: ['a law firm in Limassol', 'existing client SAMOWAR'], refuseA: 0.15 },
    { c: 'AR', w: [2e6, 20e6], fee: [0.012, 0.016], risk: 'Normal', cash: 0.1, weight: 1,
      cities: ['Buenos Aires', 'Córdoba', 'Rosario'],
      occ: ['Agribusiness (soy exports)', 'Industrialist', 'Cattle rancher'],
      sow: ['Business income', 'Sale of land'],
      intro: ['an escribanía in Buenos Aires'], refuseA: 0.1 },
    { c: 'BR', w: [2e6, 30e6], fee: [0.012, 0.016], risk: 'Normal', cash: 0.05, weight: 0.8,
      cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'],
      occ: ['Construction entrepreneur', 'Sugar and ethanol producer', 'Media owner'],
      sow: ['Business income', 'Family wealth'],
      intro: ['a doleiro in São Paulo', 'a law firm in Montevideo'], refuseA: 0.15 },
    { c: 'GR', w: [5e6, 60e6], fee: [0.010, 0.013], risk: 'Normal', cash: 0.1, weight: 1,
      cities: ['Piraeus', 'Athens', 'Thessaloniki'],
      occ: ['Shipowner (tankers)', 'Ship broker'],
      sow: ['Shipping income'],
      intro: ['existing client ALBATROS'], refuseA: 0.05 },
    { c: 'AE', w: [5e6, 50e6], fee: [0.011, 0.015], risk: 'Normal', cash: 0.05, weight: 0.6,
      cities: ['Dubai', 'Abu Dhabi'],
      occ: ['Real estate developer', 'Trading house owner'],
      sow: ['Business income'],
      intro: ['a business partner in Dubai'], refuseA: 0.05 },
    { c: 'KZ', w: [15e6, 90e6], fee: [0.018, 0.025], risk: 'PEP', cash: 0, weight: 0.5, offshore: true,
      cities: ['Almaty', 'Astana'],
      occ: ['Senior official, state oil company', 'Deputy governor of a region'],
      sow: ['Consulting fees', 'Family business'],
      intro: ['a law firm in London', 'a "consultant" in Geneva'], refuseA: 0.1 },
    { c: 'NG', w: [10e6, 60e6], fee: [0.018, 0.025], risk: 'PEP', cash: 0, weight: 0.4, offshore: true,
      cities: ['Lagos', 'Abuja'],
      occ: ['Former state governor', 'Senior official, ports authority'],
      sow: ['Business interests', 'Consulting fees'],
      intro: ['a law firm in London'], refuseA: 0.2 },
    { c: 'VE', w: [10e6, 50e6], fee: [0.018, 0.024], risk: 'PEP', cash: 0, weight: 0.4, offshore: true,
      cities: ['Caracas', 'Maracaibo'],
      occ: ['Former director, state oil company', 'Senior official, Ministry of Finance'],
      sow: ['Consulting fees', 'Family business'],
      intro: ['existing client ORCHIDEE'], refuseA: 0.1 }
  ];

  D.TRIP_DEST = [
    { c: 'DE', city: 'Frankfurt / Munich / Stuttgart', note: 'Mittelstand owners and professionals. Steuerfahndung is active at the border.' },
    { c: 'IT', city: 'Milan / Como / Brescia', note: 'Cash-rich entrepreneurs. Guardia di Finanza checks at Chiasso.' },
    { c: 'FR', city: 'Paris / Lyon / Côte d\'Azur', note: 'Old money and professionals.' },
    { c: 'GB', city: 'London', note: 'Property and City money. Relatively low scrutiny.' },
    { c: 'US', city: 'Miami / Houston / New York', note: 'Large tickets. The IRS takes a dim view of Swiss bankers on US soil.' },
    { c: 'AR', city: 'Buenos Aires', note: 'Capital flight. No home-country enforcement.' },
    { c: 'BR', city: 'São Paulo / Rio de Janeiro', note: 'New wealth, informal money changers.' },
    { c: 'RU', city: 'Moscow', note: 'Very large tickets, increased-risk profiles.' }
  ];

  // Kunden-Anliegen bei Telefonaten
  D.FAVOURS = [
    { key: 'hotel', text: 'asks you to reserve a suite at the Dolder and a table at the Kronenhalle for Saturday.', cost: 0, loyalty: 3, min: 10 },
    { key: 'nephew', text: 'asks whether the bank could offer his nephew a traineeship in the back office.', hire: true, loyalty: 10, min: 15 },
    { key: 'cashair', text: 'is arriving at Kloten on Friday and would like cash brought to the airport – discreetly.', personal: 1, loyalty: 8, min: 20 },
    { key: 'letter', text: 'needs a letter confirming "sufficient funds" for a property purchase at home – without naming the bank in the letterhead.', personal: 0.5, loyalty: 6, min: 15 },
    { key: 'gift', text: 'would like you to organise a Rolex as a birthday present for a business partner, paid from the account.', loyalty: 4, min: 15 }
  ];
})(window.PBS);
