# PBS/Web – Bankhaus Vogt & Cie

A management game about Swiss banking secrecy, set in 2003 and dressed up as the internal
intranet of a small Zürich private bank. You are the new Managing Partner of **Bankhaus Vogt & Cie**
(founded 1871). You run the bank in its "Private Banking System" (PBS/Web 4.2), the kind of web
application a bank used in Internet Explorer 6 at 1024×768.

Your clients pay handsome fees to keep their money out of sight of their home tax authorities.
Grow assets and profits without losing your banking licence or ending up in a foreign courtroom.

![Dashboard](docs/screenshots/dashboard.png)

## Running it

The game is plain HTML5, CSS and JavaScript. There is no build step and nothing to install.

- **Locally:** open `index.html` in a browser, or serve the folder:
  `python3 -m http.server 8000`, then go to <http://localhost:8000>.
- **GitHub Pages:** enable Pages for the `main` branch (root folder) in the repository settings.

The game saves itself in the browser's `localStorage`. To start over, use **New game** in the
toolbar or **Reset game data** on the sign-on screen.

### Signing on

The sign-on screen is part of the game. Any user ID and any password work. The **token code** is
the six-digit number shown on the security token lying on the desk next to the form. It changes
every 30 seconds.

## How to play

A business day goes like this:

1. **Mail & fax** – read memos and letters. Accept or decline new clients introduced by lawyers and
   fiduciaries. Answer the Federal Office of Justice, the EBK and journalists.
2. **Payments → Release queue** – clients fax payment orders. Release them (four-eyes principle),
   reject them, or edit them first: debit a domiciliary company's account instead of the client's
   own, or send the SWIFT MT103 as "ONE OF OUR CLIENTS" without an originator name.
3. **Payments → Cash desk** – couriers bring banknotes and clients want cash. Anyone not served by
   the end of the day leaves unhappy.
4. **Compliance → Alerts** – transaction monitoring flags cash over CHF 25,000, transfers over
   CHF 1 million, PEP activity, missing Form A, and so on. Clear alerts within 10 business days.
   A thin justification is quicker, but the auditors may find it.
5. **End of day** (toolbar button or **F9**) runs the batch job PBSEOD01: market prices move,
   portfolios are revalued, fees accrue, the value date advances and new events arrive.

### Money

- Management fees (accrued daily, debited quarterly), commissions on payments, cash and
  securities, FX and gold margins, and fees for setting up and running domiciliary companies.
- Running costs grow with the size of the bank. Equity capital must stay above the legal minimum
  of CHF 10 million.

### Risk

The **Risk monitor** shows exposure indices from 0 to 100 for the Swiss regulator (EBK) and the
tax authorities of the US, Germany, Italy, France and the UK. When an index reaches 100, the game
ends: licence withdrawn, indictment or arrest warrant, reported on the front page of the
*Zürcher Finanzblatt*.

| What you do | Effect |
|---|---|
| Payments into a client's home country | Paper trail with that country's tax authority |
| Hold mail (banklagernd) | No statements mailed abroad, fewer documents found at border checks |
| Domiciliary companies (BVI, Panama, Bahamas, Liberia, Liechtenstein) | Shield payments; a Liechtenstein foundation shields best |
| "One of our clients" in field 50 | Less trail abroad; after 1 July 2003 it triggers an alert |
| PEP and increased-risk clients | Higher fees, steady EBK attention |
| Overdue or thinly documented alerts | EBK attention, audit findings |
| Report to MROS | Calms the EBK, costs you the client and client confidence |

**Mutual legal assistance.** When a foreign authority gets interested, the Federal Office of Justice
forwards its request. Under Swiss law at the time, simple tax evasion was not a crime, so assistance
could be refused (Art. 3 para. 3 IRSG). Tax fraud with forged documents was a crime, so assistance
had to be granted. Read the legal note from Dr. Wyss: refusing a fraud request angers the EBK, and
handing over documents for mere evasion breaches banking secrecy (Art. 47 BankG).

**History happens.** The game runs on a real calendar with dated events: the Iraq war rally (2003),
the EBK anti-money-laundering ordinance (July 2003), the EU savings tax (July 2005), the Liechtenstein
data leak (2008) and Lehman Brothers (September 2008). The statutory auditor arrives every September.

## Project structure

```
index.html        Page shell: icon sprite, sign-on screen, application frame
css/pbs.css       Early-2000s intranet look (Windows 2000 controls, Verdana, navy tables)
js/util.js        Swiss number and date formatting, business days, IBAN check digits
js/data.js        Bank, clients, companies, BIC directory, prospects, headlines, timeline
js/engine.js      Game rules: bookings, monitoring, exposure, events, end-of-day batch, saving
js/views.js       Screens (read-only rendering of the game state)
js/app.js         Sign-on, routing, dialogs, actions and the batch console
```

Game rules live in `js/engine.js`. Views never change the state directly; all actions go through
`PBS.Game`. Most balancing numbers (fees, thresholds, exposure factors, event weights) sit in
`js/data.js` and near the top of the relevant functions in `js/engine.js`.

## Disclaimer

This is a game and a satire of a real chapter of financial history. All banks, persons, companies,
BICs and account numbers are fictitious. Swiss law, institutions and historical events are referred
to in simplified form. Nothing here is legal or tax advice.
