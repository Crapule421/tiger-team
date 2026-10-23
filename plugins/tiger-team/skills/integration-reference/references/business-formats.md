# Business formats: data formats, encodings, EDI, banking, healthcare, mapping

## Contents
1. Format choice
2. XML and XSD
3. JSON and JSON Schema
4. CSV
5. Fixed-width and COBOL-style records
6. Character encodings (UTF-8, ISO-8859-15, Windows-1252, EBCDIC/CCSID)
7. EDI: UN/EDIFACT and ANSI X12
8. Banking: ISO 20022, SEPA, CFONB, identifiers
9. E-invoicing (EN 16931, Factur-X, UBL, CII)
10. Healthcare: HL7 v2, FHIR R4, INS (France)
11. Mapping specification best practices
12. Pitfalls

## 1. Format choice
| Format | Strengths | Weaknesses | Typical use |
|---|---|---|---|
| XML + XSD | Strict typing, namespaces, signatures (XML-DSig), mature validation | Verbose, parsing cost, namespace complexity | ISO 20022, SOAP, regulatory filings, HL7 CDA |
| JSON + JSON Schema | Lightweight, native to REST, readable | Number precision, weaker schema culture | APIs, events, FHIR (JSON) |
| CSV | Universal, Excel-friendly | No standard types, encoding/quoting ambiguity | Bulk exports, business users |
| Fixed-width | Mainframe/IBM i/legacy friendly, fast | Rigid, padding/sign rules, silent truncation | CFONB, COBOL systems, legacy ERPs |
| Avro / Protobuf | Compact, schema evolution rules, registry | Binary (needs tooling) | Kafka events, gRPC |
| EDIFACT / X12 | Industry standard B2B, partner ecosystems | Cryptic, implementation-guide dependent | Retail, logistics, automotive, US healthcare |

## 2. XML and XSD
- Namespaces: decide `elementFormDefault="qualified"` (usual) and keep namespace URIs stable — changing a namespace is a breaking change.
- Types: `xs:decimal` with `totalDigits`/`fractionDigits` for amounts (never float/double); `xs:date` and `xs:dateTime` (state whether a time zone is required; a dateTime without offset is ambiguous); restrictions with `xs:pattern`, `xs:enumeration`, `xs:maxLength`.
- Cardinality via `minOccurs`/`maxOccurs`; `nillable="true"` + `xsi:nil` differs from an absent element — define the meaning.
- XSD 1.0 is the interoperable baseline; XSD 1.1 (assertions, conditional types) has limited tool support — verify before using.
- Security: disable DTDs/external entities (XXE), limit entity expansion, document size and depth; validate against the schema before mapping.
- Signatures: XML-DSig requires exact canonicalisation; any intermediary reformatting (pretty printing, namespace prefix change, encoding change) breaks it.
- Large documents: streaming parsers (StAX/SAX) instead of DOM.

## 3. JSON and JSON Schema
- JSON per RFC 8259; UTF-8 is required for JSON exchanged between systems.
- JSON Schema drafts: draft-04, -06, -07, 2019-09, 2020-12. OpenAPI 3.1 aligns with 2020-12; OpenAPI 3.0 uses its own subset. State the draft (`$schema`) in each schema.
- `format` (date-time, email, uuid…) is an annotation by default in 2020-12, not an assertion — enable format validation explicitly or use `pattern`.
- Numbers are often parsed as IEEE 754 doubles: send amounts as strings (`"1234.56"`) or integer minor units; large integer IDs (> 2^53) as strings.
- `additionalProperties: false` makes evolution breaking for strict consumers; tolerant readers prefer to ignore unknown properties.
- Required vs nullable vs absent: three different states — document them.
- Bulk/streaming: JSON Lines / NDJSON (one object per line) rather than one huge array.

## 4. CSV
RFC 4180 baseline: CRLF line breaks, fields containing delimiter, quote or line break enclosed in double quotes, embedded quote doubled (`""`), optional header line.

Contract must state:
| Item | Typical decision |
|---|---|
| Delimiter | `;` in French business contexts (Excel FR uses comma as decimal separator); `,` internationally |
| Decimal separator | `.` preferred for system-to-system; never mix within a file |
| Thousands separator | None |
| Quoting | Always quote text fields, or quote only when needed — but be consistent |
| Header row | Yes, with exact column names; column order fixed or name-based |
| Encoding / BOM | UTF-8 without BOM for systems; UTF-8 with BOM if humans open it in Excel — say which |
| Dates | `YYYY-MM-DD`, timestamps ISO 8601 with offset |
| Null vs empty | Empty field = null; empty string distinguished only if quoted `""` (state it) |
| Line breaks in fields | Forbidden or quoted |

Pitfalls: Excel removing leading zeros (account numbers, postal codes, SIRET) and converting long numbers to scientific notation; formula injection when CSV is opened in spreadsheets (cells starting with `=`, `+`, `-`, `@`) — escape on export; trailing delimiters; mixed line endings.

## 5. Fixed-width and COBOL-style records
- Positions documented 1-based (start, length, end) with type and padding: alphanumeric left-aligned space-padded; numeric right-aligned zero-padded; implied decimals (e.g. `PIC 9(13)V99` = 15 digits, 2 implied decimals).
- Signed numbers: separate sign character, or **zoned decimal overpunch** (sign carried in the zone of the last digit; in EBCDIC the zone nibble is C = positive, D = negative, F = unsigned), or **packed decimal** (COMP-3: two digits per byte, sign in the last nibble, C/D/F). Binary fields (COMP/COMP-4) are big-endian on IBM platforms.
- Packed and binary fields must be transferred in **binary mode** — text conversion corrupts them; convert to display format before leaving the mainframe/IBM i when possible.
- Record types: header / detail / trailer identified by a record code in fixed positions; trailer carries counts and control totals.
- The COBOL copybook or DDS (IBM i) is the authoritative layout; version it with the contract.
- Truncation is silent: validate lengths at the source and fail on overflow.

## 6. Character encodings
| Encoding | IBM CCSID | Notes |
|---|---|---|
| UTF-8 | 1208 | Default for new interfaces; BOM optional (avoid for system-to-system unless agreed) |
| UTF-16 | 1200 | Windows/Java internal; rarely on the wire |
| ISO-8859-1 (Latin-1) | 819 | No euro sign; lacks French Œ œ Ÿ |
| ISO-8859-15 (Latin-9) | 923 | Adds € (0xA4), Š š Ž ž Œ œ Ÿ vs Latin-1 |
| Windows-1252 | 1252 | € at 0x80; often mislabeled as ISO-8859-1 |
| EBCDIC US/Canada | 37 (1140 with €) | |
| EBCDIC France | 297 (1147 with €) | Typical on French IBM i / z/OS systems |
| EBCDIC International | 500 (1148 with €) | |
| EBCDIC Latin-1 open systems | 1047 | z/OS UNIX |
| "No conversion" | 65535 | IBM i tagging meaning binary/hex — causes unconverted data in ODBC/MQ |

Rules: declare encoding in the contract and in the payload where the format allows (XML declaration, HTTP `charset`, MQ CCSID, CFT/FTP text mode); convert once, at a defined boundary; test with a reference string containing `é è à ç ù œ € ’ «»` and characters outside Latin-9. Mojibake signatures: `Ã©` = UTF-8 read as Latin-1/1252; `?` or `¿` replacement = lossy conversion; `Ã¢â‚¬â„¢` = double encoding.
SEPA character set: EPC rules allow a basic Latin set (`a-z A-Z 0-9 / - ? : ( ) . , ' +` and space); other characters must be transliterated or may be rejected — verify each bank's acceptance. References (EndToEndId, MsgId…) must not start or end with `/` nor contain `//`.

## 7. EDI: UN/EDIFACT and ANSI X12
**UN/EDIFACT**
- Envelope: `UNA` (service string advice, optional), `UNB`…`UNZ` (interchange), `UNG`…`UNE` (functional group, optional), `UNH`…`UNT` (message).
- Default separators (UNA): component `:`, data element `+`, decimal mark `.`, release (escape) `?`, reserved space, segment terminator `'`.
- Syntax identifiers / character sets: `UNOA` (uppercase basic), `UNOB`, `UNOC` (ISO 8859-1)… — agree per partner.
- Common messages: ORDERS (order), ORDRSP (order response), DESADV (despatch advice), RECADV (receiving advice), INVOIC (invoice), REMADV (remittance advice), PAYMUL (multiple payment order), CONTRL (syntax/service acknowledgment), APERAK (application error and acknowledgment).
- Directories versioned (e.g. D.96A, D.01B); industry subsets (EANCOM for retail/GS1, ODETTE for automotive) and partner implementation guides define what is actually used — always map against the implementation guide, not the full directory.
**ANSI X12**
- Envelope: `ISA`…`IEA` (interchange, ISA is fixed length), `GS`…`GE` (functional group), `ST`…`SE` (transaction set).
- Common sets: 850 purchase order, 855 PO acknowledgment, 856 ship notice/manifest, 810 invoice, 820 payment order/remittance, 997 functional acknowledgment, 999 implementation acknowledgment (HIPAA), TA1 interchange acknowledgment; US healthcare HIPAA: 837 claim, 835 remittance, 270/271 eligibility.
**EDI rules**: control numbers unique and sequential per partner (duplicate detection); functional ack (CONTRL/997) within agreed delay; business response (APERAK/ORDRSP/855) separate from syntax ack; code lists (units, qualifiers) per implementation guide.

## 8. Banking: ISO 20022, SEPA, CFONB, identifiers
**ISO 20022 message identification**: `<business area>.<message number>.<variant>.<version>`, e.g. `pain.001.001.09`. Versions matter: banks publish which versions they accept. Commonly met: pain.001.001.03 / pain.008.001.02 / pain.002.001.03 / camt.05x.001.02 (2009 generation, long used for SEPA) and pain.001.001.09 / pain.008.001.08 / pain.002.001.10 / camt.05x.001.08 (2019 generation: the EPC 2023 rulebooks and implementation guidelines based on it entered into force on 19 November 2023, SDD B2B on 17 March 2024; since 17 March 2024 originator and creditor PSPs must be able to accept the 2019 versions from customers, while the 2009 versions remain accepted bilaterally). Verify the exact versions with each bank's implementation guide.

| Message | Purpose | Key elements |
|---|---|---|
| pain.001 Customer Credit Transfer Initiation | Corporate → bank payment orders | `GrpHdr` (MsgId, CreDtTm, NbOfTxs, CtrlSum, InitgPty); `PmtInf` (PmtInfId, PmtMtd `TRF`, BtchBookg, PmtTpInf/SvcLvl `SEPA`, LclInstrm `INST` for instant where used, ReqdExctnDt, Dbtr, DbtrAcct, DbtrAgt, ChrgBr `SLEV` for SEPA); `CdtTrfTxInf` (PmtId/InstrId + EndToEndId, Amt/InstdAmt with Ccy, CdtrAgt, Cdtr, CdtrAcct, RmtInf Ustrd ≤ 140 chars or Strd) |
| pain.002 Customer Payment Status Report | Bank → corporate status of a pain.001/pain.008 | Original message/PmtInf/transaction references; status codes e.g. `ACTC` (technical validation passed), `ACCP`, `ACSP`, `ACSC`, `PART` (partially accepted), `PDNG`, `RJCT`; reason codes (ExternalStatusReason1Code) e.g. AC01 incorrect account number, AC04 closed account, AC06 blocked account, AG01 transaction forbidden, AM04 insufficient funds, AM05 duplication, BE05 unrecognised initiating party, FF01 invalid file format, MD01 no mandate, MS02/MS03 reason not specified (customer/agent), RC01 bank identifier incorrect |
| pain.008 Customer Direct Debit Initiation | Creditor → bank SEPA direct debit collections | LclInstrm `CORE` or `B2B`; SeqTp `FRST`/`RCUR`/`OOFF`/`FNAL`; ReqdColltnDt; CdtrSchmeId (creditor identifier); MndtRltdInf (MndtId = UMR ≤ 35 chars, DtOfSgntr, AmdmntInd + AmdmntInfDtls) |
| camt.052 Account Report | Intraday account report | Same structure as camt.053, interim balances and entries |
| camt.053 Bank to Customer Statement | End-of-day statement | `Stmt/Acct`, `Bal` (types e.g. OPBD opening booked, CLBD closing booked, CLAV closing available, ITBD interim booked), `Ntry` (Amt, CdtDbtInd `CRDT`/`DBIT`, Sts, BookgDt, ValDt, AcctSvcrRef, BkTxCd Domn/Fmly/SubFmly e.g. PMNT/RCDT/ESCT, NtryDtls/TxDtls with Refs/EndToEndId and RmtInf) |
| camt.054 Debit/Credit Notification | Detail of bookings (e.g. batch booking breakdown, SDD returns) | Ntry/NtryDtls/TxDtls with return reason information where applicable |

Structure notes: versions after the 2009 generation name the BIC element `BICFI` (2009: `BIC`); in the 2019 generation `ReqdExctnDt` contains `Dt` or `DtTm` and the camt entry status is a coded structure — verify per version. Batch booking (`BtchBookg=true`) produces one statement entry for many transactions: reconciliation needs camt.054 or TxDtls.

**SEPA schemes (EPC rulebooks; current generation = 2025 rulebooks in force since October 2025, SCT version 1.2 published 30 September 2026 — always cite the exact version in the contract)**
- **SCT** (SEPA Credit Transfer): EUR, D+1 maximum execution; identifiers IBAN (BIC optional for SEPA within the EEA).
- **SCT Inst**: funds available to payee within 10 seconds (clock starts at receipt of the order), 24/7/365; the 2025 rulebook no longer sets a scheme-level maximum amount (PSPs may set their own limits). Regulation (EU) 2024/886 (Instant Payments Regulation): euro-area PSPs must receive instant credit transfers since 9 January 2025 and send them, with **Verification of Payee** (name/IBAN match before execution), since 9 October 2025; the EPC VoP scheme rulebook entered into force on 5 October 2025 (version 1.1 effective 20 September 2026). Later dates apply to non-euro-area PSPs and to PIs/EMIs — verify; impacts on corporate bulk payment flows (VoP results, opt-out options) must be confirmed with each bank.
- **SDD Core** (consumers and businesses) and **SDD B2B** (businesses only, no refund right for authorised debits, debtor bank must hold mandate data). Collections presented at the latest D-1 interbank business day and at the earliest 14 calendar days before due date (banks impose earlier customer cut-offs); pre-notification 14 calendar days before due date unless otherwise agreed; Core refund right 8 weeks after debit for authorised debits (no questions asked), 13 months for unauthorised ones (2025 Core rulebook). `FRST` has been optional since the November 2016 rulebook (v9.0): a first collection may be sent as `FRST` or `RCUR` and both are processed identically (no AG02 reject for `RCUR`), while `FNAL` is still required for the last collection; `RCUR` is recommended for re-presentations.
- **Creditor identifier** (France, ICS): `FR` + 2 check digits + 3-char creditor business code (default `ZZZ`) + 6-char national identifier.
- **R-transactions**: reject (before settlement), return (after settlement, initiated by debtor bank), refund (debtor claim), reversal (creditor), request for cancellation/recall, revocation, refusal. Corporate side: rejects typically in pain.002; returns/refunds appear in camt.054/camt.053 with reason codes (e.g. AC04, AM04, MD01, MD06 refund request, MS02, SL01 specific service).
- Structured postal addresses: the EPC is phasing out fully unstructured addresses in favour of structured or "hybrid" (structured town and country + unstructured lines) addresses. The planned end date (22 then 15 November 2026) was postponed by version 1.2 of the 2025 SCT rulebook (30 September 2026) to a date still to be defined; the hybrid format has no end date. SWIFT CBPR+ follows its own timetable — verify for cross-border flows.

**CFONB (France) fixed-width formats** — named by record length; layouts are defined by CFONB/bank guides, verify before mapping:
- **CFONB 120**: bank account statements ("relevés de compte"), 120-character records 01 (previous balance), 04 (movement), 05 (optional movement complement, repeatable), 07 (new balance), per the CFONB brochure "Relevé de compte sur support informatique" (July 2004; the March 2010 evolution adds SEPA SCT/SDD data in 05 records); operation codes come from the CFONB "Codes opérations interbancaires pour les restitutions clientèle" brochure; amounts with implied decimals and a sign-carrying last character (overpunch-style) — verify the encoding table in the specification.
- **CFONB 160**: historic domestic remittance formats (transfers/direct debits largely replaced by SEPA pain since 2014-2016); still used for LCR/BOR (lettre de change relevé / billet à ordre relevé) — verify with the bank.
- **CFONB 240 / 320**: other remittance/report formats, 320 commonly associated with international transfer orders — verify usage per bank.
- SWIFT MT940/MT942 statements still common for multi-bank corporate reporting alongside camt.053/052; SWIFT MT→ISO 20022 (CBPR+) coexistence for cross-border payment instructions ended on 22 November 2025 (MT category 1, 2 and 9 instruction messages retired); non-instruction/reporting messages keep a later timetable — check the impact on corporate channels with each bank.

**Identifiers and checks**
- IBAN (ISO 13616): country code + 2 check digits (mod 97) + BBAN; French IBAN is 27 characters: bank code (5), branch code (5), account number (11), RIB key (2).
- BIC (ISO 9362): 8 or 11 characters.
- SIREN 9 digits, SIRET 14 digits (SIREN + 5-digit NIC), Luhn check (known exceptions exist — verify for specific entities); French intra-EU VAT number: `FR` + 2-character key + SIREN.
- LEI (ISO 17442): 20 characters, for legal entities in financial reporting.

## 9. E-invoicing (EN 16931, Factur-X, UBL, CII)
- EN 16931: European semantic model for electronic invoices; syntaxes UBL 2.1 and UN/CEFACT CII (D16B); Peppol BIS Billing 3.0 is a CIUS on top of it.
- Factur-X (FR) / ZUGFeRD (DE): PDF/A-3 with embedded CII XML; profiles MINIMUM (Chorus Pro minimum data), BASIC WL (document level only), BASIC (+ core line data), EN 16931 (full European norm data), EXTENDED (EN 16931 + additional data); current publication Factur-X 1.09.2 / ZUGFeRD 2.5.2 (August 2026). Under the French reform the MINIMUM profile cannot be used (insufficient structured data, AFNOR XP Z12-012) and BASIC WL is a transitional profile without line data — check the DGFiP external specifications for the profiles accepted on your flows.
- France B2B e-invoicing and e-reporting reform (loi de finances 2024, art. 91; CGI art. 289 bis): since 1 September 2026 all companies must be able to receive electronic invoices and large companies and mid-size companies (ETI) must issue them; SMEs and micro-enterprises must issue from 1 September 2027; e-reporting follows the same calendar. Invoices flow through approved platforms ("plateformes agréées", formerly PDP) that every company must designate (one or several, possibly different for issuing and receiving); base formats of the "socle" accepted by all platforms: Factur-X, UBL, CII — check lifecycle statuses and the current platform list in the DGFiP specifications.

## 10. Healthcare: HL7 v2, FHIR R4, INS (France)
**HL7 v2.x** (v2.5 / 2.5.1 most common in France via IHE profiles)
- Encoding: segments separated by CR; field `|`, component `^`, repetition `~`, escape `\`, sub-component `&` (declared in MSH-1/MSH-2).
- MSH key fields: MSH-9 message type (e.g. `ADT^A01^ADT_A01`), MSH-10 message control ID (unique, used for ack and dedup), MSH-11 processing ID (P production, T training, D debugging), MSH-12 version ID.
- Acknowledgment: ACK with MSA-1 `AA` accept / `AE` error / `AR` reject (original mode) or `CA`/`CE`/`CR` (enhanced mode commit ack); MSA-2 echoes MSH-10.
- Transport: MLLP over TCP — start block 0x0B, end block 0x1C followed by 0x0D; no built-in security → TLS tunnel or VPN required.
- Frequent segments: EVN, PID (PID-3 identifier list, PID-5 name, PID-7 birth date, PID-8 sex), PV1 (PV1-19 visit number), NK1, MRG (merge), ORC/OBR (orders), OBX (OBX-2 value type, OBX-3 observation identifier, OBX-5 value, OBX-11 result status), NTE, AL1, DG1, IN1.
- ADT events: A01 admit, A02 transfer, A03 discharge, A04 register outpatient, A05 pre-admit, A08 update patient information, A11 cancel admit, A12 cancel transfer, A13 cancel discharge, A28 add person, A31 update person, A40 merge patient (identifier list).
- Orders/results: ORM^O01 (general order, older versions; newer laboratory profiles use OML), ORU^R01 (observation results); also SIU (scheduling), MDM (documents), DFT (financial).
- France: IHE PAM with the French national extension (IHE France / Interop'Santé, constrains HL7 v2.5; release 2.10.2 of July 2021, release 2.11 referenced by ANS guides) for patient administration; HPRIM Santé / HPRIM XML still met for laboratory results — verify the exact release in each partner's conformance statement.
- Pitfalls: "same message type" implemented differently by each vendor (Z-segments, field reuse); event ordering (A08 before A01); merges (A40) not propagated; cancel events ignored; repeated fields truncated to first repetition.

**FHIR R4 (4.0.1)** — still the dominant release in production; R4B (4.3.0) exists and R5 (5.0.0, STU) is the current published version; the French national profiles (FR Core 2.2.0, March 2026) are based on R4 4.0.1.
- Resources: Patient, Practitioner, PractitionerRole, Organization, Location, Encounter, Observation, DiagnosticReport, ServiceRequest, MedicationRequest, Condition, AllergyIntolerance, Appointment, DocumentReference, Binary, Bundle, OperationOutcome, Consent, Coverage, Provenance, AuditEvent.
- REST: `GET [base]/Patient/[id]`, `GET [base]/Patient?identifier=<system>|<value>`, `POST [base]/Patient`, `PUT [base]/Patient/[id]`, versioned read `[base]/Patient/[id]/_history/[vid]`; capabilities at `[base]/metadata` (CapabilityStatement); media types `application/fhir+json`, `application/fhir+xml`.
- Search parameters: `_id`, `_lastUpdated`, `_count`, `_sort`, `_include`, `_revinclude`, `_elements`, `_summary`; paging via Bundle `link` relation `next`.
- Conditional create (`If-None-Exist` header) and conditional update (`PUT [base]/Patient?identifier=...`) for idempotence; `ETag`/`If-Match` for versioning.
- Bundles: `transaction` (atomic, all or nothing) vs `batch` (independent entries); errors as OperationOutcome.
- Security: SMART App Launch (user-facing apps), SMART Backend Services (system-to-system OAuth2 client credentials with signed JWT client assertion); Bulk Data Access (`$export`, NDJSON) for population-level extracts.
- Profiles and terminology: identify the implementation guide (France: FR Core, published by Interop'Santé under HL7 France / IHE France governance, and the ANS CI-SIS specifications — pin the version in force for the project); code systems (LOINC, SNOMED CT, CIM-10/ICD-10, CCAM in France) with explicit `system` URIs.

**INS — Identité Nationale de Santé (France)**
- Patient identifier for referencing health data, mandatory since 1 January 2021 (Code de la santé publique art. R1111-8-1; référentiel INS version 2.1, arrêté of 13 December 2024): INS matricule (NIR or NIA) + OID of the assigning authority + the strict identity traits (birth name, first name(s) at birth, date of birth, sex, place of birth code).
- Obtained/verified through the INSi teleservice; identity statuses per the national identity-vigilance referential (RNIV): provisional, retrieved, validated, qualified. The INS may be used and transmitted in exchanges only when the identity is **qualified** (retrieved via INSi and validated against an identity document).
- In HL7 v2 and FHIR, the INS is carried as an identifier with the authority OID, alongside the local IPP; follow the CI-SIS / IHE PAM FR / FR Core guidance for the exact fields and identity reliability codes — verify current versions and OID values in ANS references.
- Real INS/NIR values are personal health identifiers: never in test data, logs or examples (use fictitious, clearly marked test identities).
- Related: health data hosting requires an HDS-certified host; secure professional messaging (MSSanté), shared record (DMP / Mon espace santé) have their own integration specifications — verify.

## 11. Mapping specification best practices
Columns of a mapping table: `# | source field (path) | source type/length | mandatory | transformation rule | target field (path) | target type/length | default | code list / lookup | example (fictitious) | comment/owner`.
- One mapping per direction and per message version; versioned with the contract.
- Value mapping (code lists, transcoding tables) owned by the business, stored as data (lookup tables), not hard-coded; behaviour for unknown codes defined (reject vs default vs pass-through + alert).
- Cross-reference (XREF) tables for IDs between systems, with ownership and lifecycle (creation on first exchange, merge, deactivation).
- Explicit rules for: rounding (half-up vs half-even, at line or total level), currency decimals (EUR 2, JPY 0…), units of measure conversion, time zone normalisation (store UTC + original offset), truncation (forbidden or with alert), concatenation/split of names and addresses, default values (forbidden for financial or identity fields unless agreed).
- Mandatory field missing at source → defined behaviour (reject record, reject file, or default + warning).
- Test with golden files: nominal, boundary (max lengths, max amounts, special characters), error and empty cases; regression suite rerun on each mapping change.
- Bidirectional consistency: A→B→A round trip should not alter data where both directions exist.

## 12. Pitfalls
- Amounts as floats; decimal comma in one system, decimal point in the other.
- Date-only fields shifted by a day after time zone conversion (midnight local → previous day UTC).
- Leading zeros lost (SIRET, account numbers, material numbers) by Excel or numeric typing.
- EBCDIC conversion applied to packed decimal fields.
- ISO 20022 version mismatch with the bank; bank-specific rules ignored (character set, BIC requirement, batch booking).
- EndToEndId not propagated → impossible automatic reconciliation of camt entries.
- HL7 v2 "standard" interface assumed plug-and-play across vendors; INS used with a non-qualified identity.
- Code list changes (new reason codes, new statuses) not handled by consumers.

## Sources
- https://www.europeanpaymentscouncil.eu/news-insights/news/key-impacts-instant-payments-regulation-2023-sct-inst-scheme-rulebook-and — IPR obligations 9 January / 9 October 2025
- https://www.europeanpaymentscouncil.eu/what-we-do/epc-payment-schemes/sepa-instant-credit-transfer/sepa-instant-credit-transfer-rulebook — 2025 SCT Inst rulebook, 10-second clock, no scheme maximum
- https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC266-25%20Press%20Release%20VOP%20rulebook%20now%20into%20force.pdf — VoP rulebook in force 5 October 2025
- https://www.europeanpaymentscouncil.eu/document-library/rulebooks/2025-sepa-credit-transfer-rulebook-version-11 — 2025 SCT rulebook, v1.2 delays address end date
- https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-11/EPC016-06%202025%20SDD%20Core%20Rulebook%20version%201.0.pdf — 2025 SDD Core rulebook, refund 8 weeks / 13 months
- https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2023-11/EPC087-22%20v4.0%20EPC%20guidance%20document%20-%20Migration%20to%20the%202019%20Version%20of%20ISO%2020022-based%20XML%20Messaging%20Standard_0.pdf — EPC migration guidance to 2019 ISO 20022 versions
- https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2021-11/EPC132-17%20v2.0%20Clarification%20Paper%20SDD%20Core%20and%20SDD%20B2B%20rulebooks.pdf — SDD clarification paper, FRST optional
- https://www.swift.com/iso-20022-financial-institutions — Swift CBPR+ roadmap, coexistence ended 22 November 2025
- https://www.cfonb.org/fichiers/20130612113947_7_4_Releve_de_Compte_sur_support_informatique_2004_07.pdf — CFONB 120-character statement brochure, records 01/04/05/07
- https://fnfe-mpe.org/factur-x/factur-x_en/ — Factur-X profiles and current version 1.09.2
- https://hl7.fr/ig/fhir/core/ — FR Core 2.2.0 based on FHIR 4.0.1
- https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises — e-invoicing reform calendar and approved platforms