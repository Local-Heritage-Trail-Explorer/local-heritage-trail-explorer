import dotenv from "dotenv";
import connectDB, { disconnectDB } from "../config/database.js";
import { Story } from "../models/story.model.js";
import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import { ingestStories } from "./ingestStories.js";

dotenv.config();

/**
 * High-quality 4-5 paragraph historical narratives for each heritage place (~5,500+ words total).
 */
export const EXPANDED_STORIES = [
  {
    placeName: "Sri Venkateswara Swamy Temple",
    title: "Dynastic Patronage and Sacred Epigraphy of Tirumala Temple",
    claimType: "history",
    content: `Epigraphical stone inscriptions recorded on the outer and inner walls of the Sri Venkateswara Swamy Temple document more than a millennium of continuous dynastic patronage. In Hindu sacred tradition and the Venkatachala Mahatmya, the holy hill of Venkatadri in the Seshachalam range is revered as the terrestrial abode chosen by Lord Srinivasa in the Kali Yuga to deliver humanity from existential distress. The physical shrine evolved from a humble mountain hermitage into an imperial religious monument as successive royal dynasties competed to adorn the deity with lavish endowments and architectural expansions.

The earliest epigraphical records belong to the Pallava dynasty during the 9th century CE. A prominent stone inscription dating to 966 CE immortalizes Queen Samavai (also known as Kadavan Perundevi), who consecrated the silver processional icon of Manavalapperumal (Bhoga Srinivasa) and granted extensive agricultural lands and gold endowments to ensure perpetual daily worship and grand festival celebrations. Following the Pallavas, the Chola and Pandya monarchs contributed magnificent structural enhancements, constructing stone prakarams, colonnaded mandapams, and granaries that formalized the daily Vaikhanasa Agama ritual schedules.

During the 14th to 16th centuries, the Vijayanagara Empire ushered in the golden era of the temple's architectural and spiritual prominence. Emperor Sri Krishnadevaraya visited the shrine seven times accompanied by his queens Tirumala Devi and Chinna Devi. The emperor personally financed the gold plating of the Ananda Nilayam vimana tower in 1517 CE, and endowed the sanctum with jeweled crowns, gem-encrusted swords, and diamond diadems. The royal presence was so profound that life-size copper statues of Krishnadevaraya and his consorts were cast and placed with folded palms inside the temple doorway, where they stand to this day.

Architecturally, the temple exemplifies the zenith of Dravidian sacred architecture. It encompasses the three-tiered Sampangi Prakaram, the towering gold-plated Ananda Nilayam tower over the sanctum sanctorum, the historic Bangaru Vakili (Golden Gate), and the carved Dhwajasthambham (flagstaff). The daily sevas follow centuries-old schedules, commencing in the pre-dawn hours with Suprabhatam, followed by Thomala Seva, Sahasranamarchana, and concluding late at night with Ekanta Seva, when the deity is put to rest upon a silver swing.

Today, the Tirumala temple stands as one of the most visited pilgrimage centers in the world, receiving tens of millions of devotees annually. Pilgrims ascend the sacred hills following the historic footsteps of venerated saints including Ramanujacharya, Sri Tyagaraja, and Tallapaka Annamacharya, who composed thousands of Telugu sankirtanas praising Lord Venkateswara. The shrine remains an enduring beacon of cultural unity, spiritual devotion, and living Indian architectural heritage.`,
  },
  {
    placeName: "Sri Venkateswara Swamy Temple",
    title: "Architectural Splendor and Consecration of Ananda Nilayam",
    claimType: "architecture",
    content: `Rising majestically above the Garbha Griha (inner sanctum) of the Tirumala temple, Ananda Nilayam—meaning "The Abode of Eternal Bliss"—is one of the most revered and celebrated golden vimanas in the Indian subcontinent. Built strictly according to the canons of Vaikhanasa Agama and Dravidian Vastu Shastra, this sacred tower marks the exact cosmic center above the self-manifested moolavirat of Lord Venkateswara, serving as both a physical protective dome and a metaphysical gateway between earth and heaven.

The architectural profile of Ananda Nilayam represents a classical three-tiered Dravidian shikhara. Its lower level consists of an adhisthana (stone plinth) carved with sacred friezes, followed by an intermediate stone tier embellished with sculpted niches containing representations of Vaishnavite deities, lions, and makara gargoyles. The upper dome curves gracefully inward, crowned by an opulent golden finial (Kalasham) that glitters in the mountain sun and is visible from surrounding peaks.

Historical inscriptions record that the tower has undergone multiple monumental gold-gilding consecrations across seven centuries. The earliest recorded gilding was carried out in 1262 CE by the Pandya monarch Jatavarman Sundara Pandya I, who used molten gold conquered from rival territories to adorn the dome. In 1517 CE, the Vijayanagara Emperor Sri Krishnadevaraya carried out an even more lavish gilding, contributing 30,000 gold coins from his military campaigns. Subsequent regildings occurred under the Saluva rulers, the Nawabs of Arcot, the Mahants of Hathiramji Mutt, and modern TTD administrations.

A focal point of veneration on the northern elevation of the tower is Vimana Venkateswara. Tradition holds that when the sanctum doors are closed for internal sevas or during immense pilgrimage crowds, viewing this relief sculpture on the golden vimana confers the identical spiritual merit and liberation as witnessing the primary deity inside. Devotees routinely stand in the inner courtyard, gazing upward with folded hands toward this divine figure.

During the morning and evening aartis, when oil lamps and camphor fires reflect against the golden surface of Ananda Nilayam, the entire courtyard is bathed in a warm celestial radiance. The tower stands not merely as an imperial triumph of metallurgy and stonecraft, but as the living spiritual crown of the Tirumala hill range.`,
  },
  {
    placeName: "Sri Bhu Varaha Swamy Temple",
    title: "The Primacy and Covenant of Adi Varaha Kshetra",
    claimType: "legend",
    content: `Nestled on the northern bank of the sacred Swami Pushkarini tank in Tirumala, the Sri Bhu Varaha Swamy Temple honors Lord Vishnu in his primordial third incarnation as Adi Varaha, the divine boar who rescued Mother Earth (Bhudevi) from the cosmic depths. While millions travel to Tirumala to worship Lord Venkateswara, ancient scripture reveals that the sacred Venkatachala hills belong rightfully and originally to Varaha Swamy, making this sanctuary the spiritual landowner of the entire mountain range.

According to the sthala purana documented in the Aditya and Brahma Puranas, when Lord Srinivasa departed Vaikuntha and descended to earth to reside upon the Seshachalam hills, he sought permission from Adi Varaha to occupy a parcel of land near the celestial lake. Varaha Swamy agreed to grant the dwelling ground, but sealed a permanent cosmic covenant: in perpetuity, every pilgrim visiting the sacred hills must first offer worship and naivedyam to Varaha Swamy before entering the sanctum of Lord Venkateswara.

In accordance with this age-old covenant, centuries of pilgrims and spiritual seekers have strictly observed the ritual protocol known as Varaha Darshanam. Entering the Varaha shrine prior to approaching the main temple is believed to ground the seeker in humility and acknowledge the primordial protective power that preserves the earth and its ecological balance. Offering naivedyam here first is considered an unbreakable duty of every sincere devotee.

Architecturally, the Varaha Swamy temple exhibits intimate and refined medieval stone craftsmanship. The sanctum preserves a magnificent granite idol of Adi Varaha holding Mother Bhudevi on his left thigh, flanked by traditional pillars inscribed with Vaishnavite insignias. The temple priests perform daily rituals following the Vaikhanasa Agama tradition, preparing special rice offerings enriched with sesame and ghee that are revered as sacred prasad.

Royal inscriptions from the Vijayanagara and Saluva dynasties confirm that kings and chieftains provided independent agricultural grants and gold jewelry specifically earmarked for the upkeep of the Varaha shrine. Standing in the shadow of the larger temple complex, the sanctuary of Varaha Swamy remains an indispensable foundation of the sacred pilgrimage experience at Tirumala.`,
  },
  {
    placeName: "Swami Pushkarini",
    title: "The Celestial Descent of Swami Pushkarini Tank",
    claimType: "spiritual_site",
    content: `Swami Pushkarini is the sacred lake of Tirumala, situated immediately adjacent to the northern perimeter wall of the Sri Venkateswara Swamy Temple. Celebrated across the Skanda, Padma, and Markandeya Puranas, this body of water is not considered an ordinary terrestrial reservoir, but a celestial tank brought down directly from Vaikuntha by Garuda, the eagle mount of Lord Vishnu, specifically for the divine sporting and morning ablutions of the Supreme Lord.

Puranic texts extol Swami Pushkarini as the sovereign of all holy waters across the universe. It is believed that the holy currents of India's sacred rivers—including the Ganga, Yamuna, Saraswati, Godavari, and Kaveri—manifest within this tank annually on the auspicious day of Mukkoti Ekadasi (Vaikuntha Ekadasi). Taking a ceremonial bath in its waters is believed to dissolve lifetimes of negative karma, bestow mental clarity, and purify the subtle body for divine contemplation.

Structurally, the tank is a masterpiece of South Indian hydraulic engineering and granite stonework. Spanning approximately one and a half acres, it is enclosed by four symmetrical tiers of wide granite steps (sopanas) that descend gracefully into the emerald-hued waters. Pillared stone pavilions line the banks, providing shade for meditation and ceremonial assemblies during grand temple festivals.

During the annual Brahmotsavam and festive seasons, Swami Pushkarini transforms into the dramatic venue for the Theppotsavam (Float Festival). A richly illuminated floral barge carrying the processional deities of Sri Malayappa Swamy, Sridevi, and Bhudevi glides across the tranquil waters under the night sky, accompanied by the chanting of Vedic hymns and classical Carnatic music. The final day culminates in Chakrasnanam, when the Sudarshana Chakra is ceremonially bathed in the tank alongside thousands of jubilant pilgrims.

Generations of pilgrims begin their spiritual ascent by descending the stone steps of Swami Pushkarini in the quiet dawn mist. Scooping the cool, consecrated water onto their heads, they experience an unbroken continuum of cleansing devotion that has endured unchanged for over two thousand years.`,
  },
  {
    placeName: "Sri Bedi Anjaneya Swamy Temple",
    title: "The Legend and Vigil of the Handcuffed Guardian",
    claimType: "legend",
    content: `Positioned directly opposite the Mahadwaram (main entrance tower) of the Sri Venkateswara Temple, the Sri Bedi Anjaneya Swamy Temple venerates Lord Hanuman in an extraordinary and captivating iconographic form. Unlike standard depictions of the monkey warrior carrying mountains or wielding maces, the granite idol here portrays Hanuman standing in respectful submission with folded hands, his wrists bound together by iron handcuffs (Bedi).

The origin of this unusual iconography is preserved in beloved local folklore. In his youthful incarnation, young Hanuman was filled with boundless celestial energy and frequently leaped from the Tirumala hills in pursuit of distant sweet fruits and cosmic adventures, leaving his guardianship of the sanctum unattended. To instill divine focus and anchor his youthful restlessness, his mother Anjana Devi bounded his wrists with iron fetters and instructed him to remain motionless before Lord Venkateswara until her return.

Fulfilling his mother's solemn command, Hanuman took an eternal vow to stand vigilance before the Golden Gate of his Lord, never moving from his post. For centuries, he has served as the frontline sentinel of the pilgrimage complex, filtering the intentions of incoming seekers, warding off demonic and negative energies, and safeguarding the sanctity of the temple grounds.

The temple consists of a compact stone mandapam and sanctum where daily rituals are performed with great devotion. Priests conduct special abhishekam using sacred butter, vermilion (sindhooram), and betel leaf garlands, which are believed to cool the immense solar energy embodied by Hanuman. Devotees facing severe astrological afflictions, fears, or legal distress flock to this shrine on Tuesdays and Saturdays to circumambulate the pillar and seek release from worldly bondages.

Every year on Hanuman Jayanti, the shrine becomes the focus of vibrant festivities, with thousands of pilgrims offering coconuts and chanting the Hanuman Chalisa. Bedi Anjaneya Swamy remains an unforgettable symbol of unwavering loyalty, filial obedience, and eternal vigilance at the entrance to the Lord's celestial court.`,
  },
  {
    placeName: "Sri Venkateswara Museum",
    title: "Repositories of Devotion: The SV Museum Galleries",
    claimType: "culture",
    content: `Situated near the Karnataka Choultries within the upper Tirumala township, the Sri Venkateswara Museum is a premier institutional archive dedicated to preserving the cultural, artistic, and religious heritage of the holy hills. Spanning multiple architecturally inspired halls, the museum houses thousands of antiquities recovered from temple vaults, surrounding archaeological sites, and historic royal donations.

One of the museum's most prized collections is its bronze gallery, which showcases exquisite medieval cast-bronze icons created during the Chola, Pandya, and Vijayanagara epochs. These bronzes depict various manifestations of Lord Vishnu, Goddess Lakshmi, celestial dancers (apsaras), and venerated Vaishnavite saints (Alwars). The precision of the lost-wax casting technique and the fluid grace of the sculptures illustrate the sophisticated artistic heights achieved by ancient Indian metallurgical guilds.

Another extraordinary wing is devoted to epigraphy and literature, featuring original copper plate inscriptions engraved with the musical sankirtanas of the 15th-century saint-composer Tallapaka Annamacharya. Annamacharya composed 32,000 devotional songs in Telugu and Sanskrit, which were inscribed on heavy copper sheets and stored for centuries inside the Annamacharya Bhandaram of the main temple. Visitors can examine these historic copper sheets alongside ancient stringed instruments like the veena and tambura.

The arms and coinage gallery offers a fascinating glimpse into the military and economic history of the temple. It displays ceremonial swords, daggers, chainmail armor, and shields contributed by royal patrons, alongside gold, silver, and copper coins minted by the Mauryan, Satavahana, Pallava, Vijayanagara, and British administrations that governed or patronized the sacred hill territory over the centuries.

Curated by professional archaeologists and conservators from the Tirumala Tirupati Devasthanams, the museum also incorporates modern interactive multimedia exhibits and educational models of the temple's structural evolution. It provides pilgrims, researchers, and cultural travelers with an indispensable context for understanding how deep spiritual faith inspired extraordinary artistic masterpieces across two millennia.`,
  },
  {
    placeName: "Silathoranam",
    title: "Precambrian Origins: The Natural Geological Arch of Silathoranam",
    claimType: "geology",
    content: `Hidden amidst the dense rocky scrub forest about one kilometer north of the main Tirumala temple, Silathoranam is an astonishing geological monument consisting of a natural stone archway. Measuring approximately twenty-five feet in width and ten feet in height, this remarkable rock bridge is sculpted from hard quartzite strata and has been declared a National Geological Monument by the Geological Survey of India (GSI).

Geological examinations establish that the rocks of Silathoranam belong to the Cuddapah Supergroup of the Precambrian era, dating back approximately 1.5 to 1.8 billion years. The arch was not carved by human chisels, but formed over hundreds of millions of years through intense differential weathering, wind erosion, and tectonic fractures in the quartzite beds. Geologically, it is one of only three known natural rock arches of this specific Precambrian genesis in the entire world, paralleling formations in Utah and the British Isles.

In regional mythology and folklore, this natural wonder is wrapped in sacred symbolism. Devotees believe that the arch served as the cosmic triumphal gateway through which Lord Venkateswara first descended onto the Seshachalam hills from the spiritual plane. The natural contours of the rock formation are said to mirror the divine emblems of Lord Vishnu—the left support resembling the sacred conch (Shankha), the right resembling the discus (Chakra), and the central arch mimicking the hood of Adisesha.

Surrounding the monument is a designated ecological park where native dry-deciduous flora and medicinal shrubs of the Eastern Ghats flourish. Paved stone pathways and wooden viewing decks allow visitors to observe the ancient bedding planes, ripple marks, and cross-bedding layers preserved in the quartzite without degrading the fragile geological formation.

Silathoranam represents a rare and breathtaking convergence of deep geological time and living mythological devotion. It stands as a silent witness to billions of years of planetary history, inviting travelers to marvel at the earth's ancient creative forces preserved intact in the heart of Tirumala.`,
  },
  {
    placeName: "Chakra Theertham",
    title: "The Perennial Spring and Cleanse of Chakra Theertham",
    claimType: "nature",
    content: `Nestled at the bottom of a deep granite ravine to the west of the Tirumala temple, Chakra Theertham is a sacred mountain spring celebrated for its serene natural beauty and spiritual cleansing powers. Fresh water trickles through thick jungle vegetation and descends over smooth reddish boulders into a natural rock pool, creating an oasis of quietude far removed from the bustling crowds of the township above.

According to the sthala purana, Lord Vishnu unleashed his divine weapon, the Sudarshana Chakra, to carve a deep cleft through the solid mountain rock and banish the demon Padmasura, who was tormenting sages meditating in the valley. As the radiant discus struck the earth, a perennial spring of crystal-clear water erupted from the fracture. In commemoration of this divine event, the pool was consecrated as Chakra Theertham, imbued with the protective and sin-cleansing energy of the Sudarshana Chakra.

Adjacent to the natural water basin stands an ancient stone shrine dedicated to Lord Swayambhu Sudarshana and Lord Shiva in the form of Kapileswara. This unique co-location of Vaishnavite and Saivite worship within the same natural cleft highlights the deep syncretic harmony that has characterized the Tirumala hills throughout historical eras. A naturally formed stone Shiva Lingam rests beside the water, regularly washed by the gentle mountain currents.

The waters of Chakra Theertham are believed to filter through dense layers of medicinal herbs and roots endemic to the Seshachalam Biosphere Reserve, endowing the stream with therapeutic and invigorating qualities. Devotees traditionally perform ancestral rites (Pitrutarpanam) along the rocky banks during solar and lunar eclipses, believing that rituals executed here bring supreme peace to departed ancestors.

Pilgrims descending the stone staircase to Chakra Theertham are greeted by the soothing melody of flowing water, the rustle of teak and bamboo leaves, and the cool shade of granite rock walls. It remains one of the most contemplative and spiritually uplifting natural sanctuaries on the Tirumala trail.`,
  },
  {
    placeName: "Srivari Padalu",
    title: "Footsteps on the Summit of Narayanagiri",
    claimType: "spiritual_site",
    content: `Perched upon the highest summit of the Tirumala hill range at an altitude of over 3,600 feet above sea level, Srivari Padalu is an iconic pilgrimage destination situated on the crest of Narayanagiri. The site commands sweeping, unobstructed views across the undulating green ridges, deep gorges, and cloud-draped valleys of the Seshachalam forest landscape.

Enshrined within an open stone pavilion and protected under a glass enclosure are the sacred stone imprints revered as Srivari Padalu—meaning "The Holy Feet of the Lord." Puranic accounts narrate that when Lord Srinivasa first descended from the celestial realms onto the terrestrial sphere, his lotus feet first touched the earth on this very rocky outcrop of Narayanagiri before he proceeded downward to meet Sage Varaha.

Pilgrims undertake the winding journey along the mountain ridge to prostrate before these holy footprints. Circumambulating the shrine three times while chanting the Govinda Nama, devotees pray for guidance along their life's journey, invoking the protective presence of the Lord to direct their steps. The brisk mountain wind and the breathtaking altitude create an atmosphere of profound detachment from worldly concerns.

Historically, Narayanagiri served as a favored hermitage for ascetic yogis and sages seeking total solitude for deep dhyana (meditation). Ancient stone markings and rock shelters around the summit attest to centuries of ascetic occupation prior to modern infrastructure development.

On clear mornings and late afternoons, visitors can look eastward across the mountain rim and catch the glittering golden reflection of the Ananda Nilayam tower far below in the valley. Srivari Padalu serves as an elevated spiritual lookout, offering both physical grandeur and a direct link to the foundational legend of the sacred hills.`,
  },
  {
    placeName: "Akasa Ganga Theertham",
    title: "The Sacred Waters for Daily Abhishekam at Akasa Ganga",
    claimType: "history",
    content: `Situated approximately five kilometers north of the main Tirumala temple along the winding mountain roadway toward Papavinasanam, Akasa Ganga is a legendary waterfall tumbling over high granite rock walls. The name literally translates to "The Ganges from the Sky," reflecting the Puranic conviction that the sacred celestial river descended from the heavens directly onto the mountain peaks to nourish the Lord's shrine.

The water of Akasa Ganga holds an exalted and indispensable status in the daily ritual economy of the Sri Venkateswara Temple. Puranic tradition states that only the pristine, untouched water gathered from this specific mountain cascade possesses the necessary purity for the Lord's daily morning abhishekam, the preparation of sacred naivedyam offerings, and the consecration of temple pots during major festivals.

A legendary narrative links this waterfall with the great Vaishnavite saint Tirumala Nambi, who lived in the 11th century. Nambi undertook a daily vow to trek barefoot through five miles of dense tiger-inhabited jungle to fetch vessels of Akasa Ganga water on his head for the temple deity. Tradition records that one day, when Nambi was aged and exhausted, Lord Srinivasa appeared disguised as a young hunter, shot an arrow into the rock beside him to yield sweet water, and revealed his divine identity to relieve his beloved devotee's burden.

To this day, the Tirumala Tirupati Devasthanams maintains an official ritual delegation that collects and transports copper vessels of water from Akasa Ganga every morning for the temple's sanctum sevas. Modern masonry tanks and conduits now channel the flow safely while maintaining the sanctified isolation of the primary spring source.

Visiting pilgrims descend a flight of shady stone steps down into the cool glen where the water cascades over stone spouts. Devotees collect droplets of the holy spray in small copper bottles to carry home, revering it as sacred theertham capable of sanctifying their homes and families.`,
  },
  {
    placeName: "Papavinasanam Theertham",
    title: "The Sin-Cleansing Stream and Cascades of Papavinasanam",
    claimType: "spiritual_site",
    content: `Located approximately eight kilometers north of the Tirumala township, Papavinasanam is one of the most famous and widely visited sacred water bodies in the Eastern Ghats. True to its Sanskrit name, which translates directly to "The Annihilator of All Sins," the theertham is celebrated in the Padma and Bhavishyottara Puranas as a spiritually potent natural cascade capable of absolving the deepest moral and psychological afflictions of sincere seekers.

The classical puranic legend recounts the story of a learned Brahmin named Bhadramathi who, burdened by severe transgressions committed in past lives, undertook intense penance on the Venkatadri hills. Guided by Sage Agastya, he immersed himself in this mountain torrent; upon emerging from the water, his spiritual vision was restored and his guilt was completely dissolved, prompting the sage to name the stream Papavinasanam.

To accommodate millions of visiting pilgrims safely, the natural waterfall has been channeled into an extensive series of stone lion-faced spouts (Simha Mukhas) mounted along elevated granite bathing platforms. Separate bathing sections for men and women allow devotees to stand directly beneath the invigorating, cool mountain cascades while offering morning prayers and Surya Namaskaram.

Just above the bathing complex, the Tirumala Tirupati Devasthanams constructed the Papavinasanam Dam during the late 20th century. This masonry reservoir captures monsoon runoff from the surrounding forested catchment basin, serving as the primary source of drinking water for the millions of pilgrims who visit the holy township throughout the year. The site stands as an inspiring harmony of ancient sacred water veneration and modern environmental water management.

Adjacent shrines dedicated to Lord Sri Rama, Goddess Sita, Lakshmana, and Goddess Ganga provide pilgrims with an immediate sacred venue for offering prayers following their ceremonial bath. The cool mountain air, the roar of falling water, and the surrounding green ridges make Papavinasanam a rejuvenating stop on the heritage trail.`,
  },
  {
    placeName: "Japali Theertham",
    title: "The Forest Hermitage of Sage Japali",
    claimType: "legend",
    content: `Tucked deep within an unspoiled deciduous forest about four kilometers from the Tirumala temple, Japali Theertham is a serene forest hermitage accessible via a shaded stone walking trail. Unlike the bustling, paved plazas of the main pilgrimage complex, Japali preserves the pristine, rustic atmosphere of an ancient Vedic ashram, shielded by towering tamarind trees, bamboo groves, and rocky mountain slopes.

The hermitage takes its name from Sage Japali, an enlightened Vedic rishi mentioned in ancient epics. Seeking an undisturbed sanctuary for deep tapasya (austerity), Japali settled in this secluded valley and meditated for centuries. Pleased by his intense focus, Lord Hanuman appeared before the sage in a radiant form, blessing the site so that any sincere prayer offered in the hermitage would grant relief from planetary afflictions, fear, and spiritual ignorance.

Another sacred tradition connects Japali with the Treta Yuga. It is believed that Lord Sri Rama, Mother Sita, and Lakshmana halted at this forested pool during their fourteen-year exile through the Dandakaranya forest. Lord Rama is said to have rested beneath the shade of the rock overhang, while Hanuman quenched his thirst in the natural spring, forever sanctifying the waters with divine presence.

The central shrine is built directly against a colossal granite boulder, housing a self-manifested (swayambhu) stone idol of Lord Hanuman coated in bright vermilion. Directly below the sanctum flows a natural spring that feeds a stone-lined kund (pool) where pilgrims wash their hands and feet before entering the sanctum. The absence of artificial noise allows visitors to hear the gentle trickle of water and the calls of forest birds during prayer.

Pilgrims seeking peace of mind, mental resilience, and relief from modern anxieties frequently walk the forest path to Japali Theertham. Offering simple betel-leaf garlands and sitting in silent meditation on the granite rocks, travelers discover an authentic touchstone of ancient ascetic India.`,
  },
  {
    placeName: "Gogarbham Gardens & Dam",
    title: "Sanaka Sanandana Theertham and the Engineering of Gogarbham",
    claimType: "nature",
    content: `Gogarbham, historically renowned in the Puranas as Sanaka Sanandana Theertham, is an expansive reservoir and scenic garden valley situated three kilometers northeast of the Tirumala temple. The site derives its classical spiritual name from the four mind-born sons of Lord Brahma—Sanaka, Sanandana, Sanatana, and Sanatkumara—who are said to have retired to this peaceful valley to meditate upon the formless Brahman in eternal spiritual youth.

The popular name "Gogarbham" (meaning "womb of the divine cow") originates from a celebrated mythological miracle. Folklore narrates that Kamadhenu, the celestial wish-fulfilling cow, visited this lush valley daily, grazing upon its sweet alpine grasses and offering her milk into the natural cleft of the rock to nourish the hidden deities of the forest. The valley was considered so sacred that ancient cowherds built rustic stone shrines to honor the divine cow.

During the twentieth century, as the volume of pilgrims ascending Tirumala increased exponentially, the Tirumala Tirupati Devasthanams engineered a modern stone and earthen dam across the valley. The resulting reservoir captured millions of gallons of crystal-clear rain runoff from the forested catchment area, solving seasonal water scarcity and establishing a vital environmental lifeline for the pilgrimage township.

Complementing the water engineering, TTD developed extensive terraced botanical gardens along the reservoir banks. These gardens cultivate millions of indigenous flowering plants—including varieties of jasmine, rose, marigold, lotus, and sacred tulasi—which are harvested daily by dedicated gardeners and woven into monumental garlands for the Lord's daily decoration inside the main temple.

Visitors walking along the Gogarbham reservoir can admire panoramic views of water mirroring the blue sky, framed by the emerald forested peaks of the Eastern Ghats. The gentle walking trails and fragrant floral breezes make Gogarbham a beloved haven for eco-pilgrims and nature enthusiasts.`,
  },
  {
    placeName: "Srivari Sikhara Darshanam",
    title: "Auspicious Vistas of the Golden Finials at Srivari Sikhara Darshanam",
    claimType: "spiritual_site",
    content: `Positioned along an elevated mountain ridge overlooking the Tirumala basin, Srivari Sikhara Darshanam is a celebrated historical lookout that provides an unobstructed line of sight toward the golden spire of the Sri Venkateswara Temple. For centuries, this strategic mountain ledge has served as a profoundly emotional viewing point where traveling pilgrims catch their first or final glimpse of the Lord's golden tower.

In Hindu temple architecture and Agama philosophy, the sikhara or vimana tower is regarded as the visible embodiment of the deity's transcendental body. Traditional Agama texts declare that "Shikhara Darshanam Papa Nashanam"—viewing the consecrated golden finial (Kalasham) and the divine form of Vimana Venkateswara atop the dome confers spiritual merit and absolution equivalent to directly standing before the inner sanctum altar.

Historically, this vantage point was of vital significance for pilgrims who, due to severe ritual restrictions, overwhelming crowd congestions, or caste barriers in earlier centuries, were unable to enter the inner sanctum. Emperors, soldiers, traveling mendicants, and wandering bards would ascend to this high ridge, prostrate fully upon the bare mountain rock, and offer their heartfelt salutations toward the glittering golden crown of the temple.

The site is equipped with paved viewing terraces, protective stone railings, and shaded resting mandapams constructed by the temple administration. Powerful mounted binoculars allow visitors to study the intricate architectural detailing of the Ananda Nilayam dome, including the golden tiles, celestial guardians, and the fluttering temple flag.

The experience at Srivari Sikhara Darshanam is particularly magical during early sunrise and the evening twilight (Sandhya). As the sun's golden rays illuminate the 24-karat gold plating against the deep purple backdrop of the Seshachalam hills, pilgrims stand together with folded palms, unified by the awe-inspiring spectacle of the sacred summit.`,
  },
  {
    placeName: "Sri Hathiramji Mutt",
    title: "Hathiram Bhavaji and the Century of Mahant Administration",
    claimType: "history",
    content: `Located adjacent to the Swami Pushkarini tank within the core temple zone of Tirumala, the Sri Hathiramji Mutt is a venerable religious institution that played a transformative role in the modern history and preservation of the sacred hills. The mutt was established in the late 15th century by Hathiram Bhavaji, a North Indian mystic and ardent devotee of Lord Rama who journeyed on foot from Rajasthan to dedicate his life to Lord Venkateswara.

According to beloved legend, Hathiram Bhavaji's devotion was so pure and intimate that Lord Venkateswara visited his simple hermit's hut every night disguised as a traveling sadhu to play games of dice (Chausar). One evening, when the game ran late into the dawn, the Lord hurriedly returned to the sanctum, leaving his diamond necklace behind in the hermit's hut. Accused of theft by temple guards, Bhavaji was imprisoned inside a room filled with sugarcane; in answer to his prayers, the Lord manifested as an elephant (Hathi) to consume the cane and vindicate his saint, earning him the title "Hathiram."

Beyond its spiritual mythology, the Mutt holds monumental historical importance. Following the fall of the Vijayanagara Empire and the subsequent collapse of the Carnatic Nawabs, the British East India Company took administrative control of the temple in 1801. However, recognizing that a Christian colonial government should not manage a Hindu sanctuary, the British formally handed over the total custody, revenue, and management of the Tirumala and Tirupati temples to the Mahants of Hathiramji Mutt in 1843.

For nearly a century, from 1843 until the statutory formation of the Tirumala Tirupati Devasthanams (TTD) in 1933, successive Mahants (head abbots) administered the temple properties. They constructed stone rest houses, improved pilgrim water supplies, guarded temple jewels, and meticulously maintained bilingual financial records that preserved the temple's autonomous wealth through turbulent historical transitions.

Today, Sri Hathiramji Mutt continues its spiritual mission, maintaining charitable annadanam (free food distribution), cow shelters (Goshalas), and Vedic study centers. The Mutt stands as an enduring bridge between North and South Indian Vaishnavite traditions and a guardian of modern Tirumala's institutional heritage.`,
  },
  {
    placeName: "Dharmagiri (Sri Venkateswara Veda Vijnana Peetham)",
    title: "A Century of Oral Vedic Transmission at Dharmagiri",
    claimType: "culture",
    content: `Perched on a serene forested hillock approximately five kilometers from the main Tirumala temple, Dharmagiri is the idyllic home of the Sri Venkateswara Veda Vijnana Peetham. Established in 1884 under the patronage of the Mahants of Hathiramji Mutt and later expanded by TTD, this prestigious institution is dedicated to preserving, teaching, and transmitting the ancient oral traditions of the Vedas in their purest, unadulterated form.

The pedagogy at Dharmagiri follows the ancient Gurukula system, recognized by UNESCO as an Intangible Cultural Heritage of Humanity. Young students enter the academy at an early age, living in communal simplicity with their Acharyas (master teachers) for ten to twelve years. They commit thousands of Vedic verses to memory using traditional mnemonic chanting techniques—such as Pada, Krama, Jata, and Ghana patha—that ensure not a single syllable or tonal pitch (swara) has altered across three millennia.

The curriculum covers all four primary Vedic recensions: Rigveda, Krishna and Shukla Yajurveda, Samaveda, and Atharvaveda, alongside auxiliary branches of learning including Veda Bhashya (commentaries), Agama Shastra, Jyotisha (astronomy), and Mimamsa (philosophical inquiry). Daily life commences before dawn with personal ablutions, Surya Namaskaram, and Agnihotra sacred fire rituals conducted under the canopy of ancient peepal and neem trees.

Dharmagiri has graduated thousands of esteemed scholars who serve as head priests (Pradhana Archakas), Vedic advisors, and ritual experts in major Hindu temples across India and internationally. The campus also maintains an extensive manuscript library containing rare palm-leaf texts and copper-plate scriptures, serving as an important center for academic indological research.

Walking along the shaded forest pathways surrounding Dharmagiri during dawn or dusk is an unforgettable sensory experience. The deep, rhythmic resonance of hundreds of young voices chanting ancient Vedic hymns echoes through the mountain mists, connecting travelers directly with the living spiritual heartbeat of Vedic civilization.`,
  },
  {
    placeName: "Sri Govindarajaswamy Temple",
    title: "Ramanujacharya and the Founding of Down-Hill Tirupati",
    claimType: "history",
    content: `Dominating the historic city center of downhill Tirupati, the Sri Govindarajaswamy Temple is one of the most magnificent and historically consequential Vaishnavite temple complexes in South India. Consecrated to Lord Vishnu in his cosmic reclining posture (Anantasayana) resting upon the multi-headed serpent Adisesha, the temple serves as the spiritual counterpart and administrative anchor to the uphill hill shrine of Venkateswara.

The temple's origins are deeply intertwined with the 12th-century philosopher-reformer Sri Ramanujacharya. During a period of intense sectarian turmoil in the Chola realm, the historic processional icon of Govindaraja was removed from Chidambaram. Ramanujacharya rescued and safely brought the sacred deity to the foothills of Tirumala, establishing a grand permanent sanctuary in 1130 CE with the support of the local Yadava kings.

To sustain the new temple and build a thriving urban center at the mountain base, Ramanujacharya laid out four broad concentric streets (Car Streets or Mada Veedhis) around the complex. He invited scholars, craftsmen, merchants, and priests to settle in this planned township, effectively founding modern Tirupati as a bustling pilgrimage metropolis. The city's urban layout and civic identity remain fundamentally rooted in Ramanujacharya's 12th-century master plan.

The architectural hallmark of the complex is its monumental outer Rajagopuram, rising to an imposing height of seven tiers. Built in the classic Vijayanagara architectural style during the 15th and 16th centuries, the tower is lavishly decorated with hundreds of sculpted stucco figures depicting scenes from the Ramayana, Mahabharata, and Bhagavata Purana. Inside, expansive pillared mandapams feature intricate stone carvings of royal patrons, mythological beasts (Yalis), and floral garlands.

Pilgrims traditionally visit Sri Govindarajaswamy to seek blessings for domestic harmony, wealth management, and peaceful travels before or after their mountain climb. The vibrant temple bazaar outside, fragrant with flowers, incense, and brassware, continues a nine-hundred-year-old living urban tradition.`,
  },
  {
    placeName: "Sri Kapileswara Swamy Temple and Kapila Theertham",
    title: "The Saivite Heritage of Kapila Theertham Waterfalls",
    claimType: "history",
    content: `Nestled at the dramatic foot of the Tirumala hill precipice, where a seasonal mountain torrent plunges over jagged granite cliffs into a broad stone basin, Sri Kapileswara Swamy Temple is the only major historic temple in the Tirupati pilgrimage region dedicated exclusively to Lord Shiva. The site represents a timeless physical and philosophical bridge between the Shaiva and Vaishnava traditions of South India.

According to ancient Puranic tradition, the great Vedic philosopher Sage Kapila Muni meditated upon Lord Shiva at this mountain foot for hundreds of years. Deeply moved by the sage's unshakeable devotion, Lord Shiva and Goddess Parvati emerged from the subterranean waters to bestow their divine darshan. In commemoration of this cosmic event, the self-manifested Shiva Lingam that appeared in the cave sanctum was named Kapileswara Swamy, and the cascading pool became known as Kapila Theertham.

Historical inscriptions carved into the granite mandapam walls testify that the temple enjoyed generous patronage from major South Indian dynasties. During the 10th and 11th centuries, Chola monarchs contributed stone endowments and gold ornaments. Later, in the 16th century, Vijayanagara Emperor Sri Krishnadevaraya and his military generals built majestic pillared stone halls around the waterfall, officially recognizing Kapileswara Swamy as the divine guardian of the southern ascent to Tirumala.

During the monsoon season, the waterfall swells dramatically, creating a thunderous cascade that roars into the temple tank and sends cool mist drifting across the sculpted stone pavilions. Devotees gather in immense numbers during Maha Shivaratri and the holy month of Karthika to take ritual dips in the tank and light thousands of terracotta oil lamps (Deepams) around the stepped ghats.

Surrounded by steep granite cliffs, sacred Nandi pavilions, and quiet rock-cut caves where yogis once meditated, Kapileswara Swamy Temple offers a tranquil, elemental encounter with Lord Shiva at the very threshold of the sacred Vaishnavite mountain.`,
  },
  {
    placeName: "Sri Padmavathi Ammavari Temple, Tiruchanur",
    title: "Goddess Padmavathi and the Golden Lotus of Alamelumangapuram",
    claimType: "culture",
    content: `Situated in the historic pilgrimage town of Tiruchanur (Alamelumangapuram), approximately five kilometers south of Tirupati, the Sri Padmavathi Ammavari Temple is consecrated to Goddess Padmavathi, the divine consort of Lord Venkateswara and the earthly manifestation of Mahalakshmi, the goddess of wealth and spiritual grace.

The temple's sthala purana narrates a touching cosmic story. Following Sage Bhrigu's test of the Trimurtis, Goddess Lakshmi departed Vaikuntha in righteous sorrow and descended to earth. She performed deep penance on the banks of the sacred Swarnamukhi River for twelve long years. Finally, on the auspicious Friday of Karthika Sukla Panchami, the goddess manifested in radiant splendor as Padmavathi, seated atop a blooming golden thousand-petaled lotus (Padma) in the center of the temple's sacred lake, Padmasarovaram.

Pilgrimage custom and theological tradition hold that a pilgrimage to Tirumala is complete only after visiting Goddess Padmavathi at Tiruchanur. As the universal mother (Jaganmatha), she is revered as the compassionate intercessor who receives the prayers of devotees, softens the Lord's stern justice, and showers seekers with material prosperity, spiritual liberation, and domestic joy.

The temple complex showcases sophisticated Vijayanagara stone architecture, featuring a soaring Rajagopuram, an intricately carved Mukhamandapam, and the sprawling Padmasarovaram tank. The sanctum preserves a breathtaking granite murti of Goddess Padmavathi seated in the padmasana (lotus posture), holding golden lotus blossoms in her upper hands, with her lower hands granting boons (Varada mudra) and fearlessness (Abhaya mudra).

The annual Karthika Brahmotsavam culminates in the grand Panchami Theertham festival, during which hundreds of thousands of pilgrims gather from across the world to bathe in the Padmasarovaram waters when the Goddess's processional idol is carried into the lake, celebrating the moment of her divine emergence.`,
  },
  {
    placeName: "Sri Kodandarama Swamy Temple, Tirupati",
    title: "Chola and Vijayanagara Legacy of Sri Kodandarama Swamy",
    claimType: "history",
    content: `Located in the heart of old Tirupati, the Sri Kodandarama Swamy Temple is an ancient sanctuary dedicated to Lord Sri Rama, his consort Mother Sita, and his devoted brother Lakshmana. The deity is worshipped here holding his celestial bow, the Kodanda, symbolizing righteousness, moral fortitude, and the protection of the virtuous.

According to regional folklore, Lord Rama, Mother Sita, and Lakshmana halted at this exact location while returning to their capital of Ayodhya after the conclusion of the war in Lanka. Legend states that the divine party rested under the shade of the forest trees at the foot of the hills, blessing the soil of Tirupati before continuing their journey northward. A sacred stepwell (Pushkarini) constructed beside the temple is believed to have been consecrated during their brief stay.

Epigraphical records carved into the inner temple walls reveal a rich lineage of royal patronage. Inscriptions identify that the sanctum and inner enclosure were constructed during the 10th century under the Chola kings. Later, in the 15th and 16th centuries, the Vijayanagara emperors—most notably Bukka Raya II and Achyuta Deva Raya—financed expansive stone renovations, adding high gopurams, pillared wedding halls (Kalyana Mandapams), and permanent agricultural lands to fund daily worship.

The temple's Mukhamandapam is an architectural masterpiece of Vijayanagara stonecraft. Its polished granite pillars are chiseled with dynamic sculptures depicting epic scenes from the Ramayana, including Hanuman delivering Rama's signet ring to Sita in Ashoka Vatika, the building of the Rama Setu bridge, and intricate geometric floral friezes.

Every year, the festival of Sri Rama Navami and the annual Brahmotsavam are celebrated with immense grandeur. The processional idols of Rama, Sita, and Lakshmana are mounted on decorated wooden chariots and carried through the historic streets of Tirupati, accompanied by traditional percussion ensembles, classical dance, and congregational singing.`,
  },
  {
    placeName: "Chandragiri Fort and Palaces",
    title: "The Royal Citadel of Chandragiri and the Indo-Saracenic Palaces",
    claimType: "history",
    content: `Perched dramatically against an imposing 600-foot granite hill twelve kilometers west of Tirupati, Chandragiri Fort is one of the most historically significant military citadels and royal residences in South India. Built in the 11th century by the Yadava Naidu rulers, the fortress later became the fourth and final imperial capital of the Vijayanagara Empire following the catastrophic Battle of Talikota in 1565 CE.

From behind Chandragiri's formidable stone ramparts, eight concentric gateways, and deep defensive moats, the emperors of the Aravidu dynasty governed the southern territories of their vast empire for nearly a century. The fort served not only as an unassailable defensive sanctuary, but as the bustling political and diplomatic court where international ambassadors, Portuguese traders, and regional chieftains negotiated treaties and trade agreements.

The crowning architectural achievement of Chandragiri is the Raja Mahal (King's Palace), an extraordinary three-story monument that exemplifies the pinnacle of medieval Indo-Saracenic secular architecture. Built entirely of granite stone, brick, lime mortar, and stucco without the use of timber beams, the palace features vaulted Islamic arches, pillared open verandas, and tiered Hindu sikhara crowns that mimic temple vimanas, demonstrating the sophisticated cultural synthesis of the late medieval Deccan.

It was within the grand halls of the Raja Mahal that King Venkata III conducted historic negotiations in August 1639 with English emissary Francis Day. The monarch granted a coastal strip of land known as Madraspatnam to the British East India Company—a foundational treaty that led directly to the construction of Fort St. George and the birth of modern Chennai (Madras).

Today, the complex is preserved as a Centrally Protected Monument by the Archaeological Survey of India (ASI). Visitors can explore the Raja Mahal museum, the elegant Rani Mahal (Queen's Palace), the ancient granite granaries, and witness a nightly Sound and Light Show that dramatically recreates the rise, triumphs, and twilight of the Vijayanagara imperial legacy.`,
  },
  {
    placeName: "Sri Kalyana Venkateswara Swamy Temple, Srinivasa Mangapuram",
    title: "The Divine Honeymoon and Vow at Sage Agastya's Ashram",
    claimType: "history",
    content: `Situated twelve kilometers west of Tirupati at the peaceful rural foot of the Seshachalam range, Sri Kalyana Venkateswara Swamy Temple in Srinivasa Mangapuram is a magnificent historic sanctuary celebrating the divine wedding and domestic bliss of Lord Venkateswara and Goddess Padmavathi.

The temple's origins are rooted in a foundational puranic narrative. Immediately following their celestial marriage at Narayanavanam, Lord Srinivasa and Goddess Padmavathi set out on their pilgrimage toward the Tirumala hills. En route, they visited the ashram of the venerated seer Sage Agastya on the banks of the Kalyani River. Welcoming the divine newlyweds with deep joy, Sage Agastya requested them to grace his hermitage with their stay, as ancient Dharmic customs prohibited newly married couples from climbing sacred mountain heights for six months.

The Lord and his bride honored the sage's hospitality and spent six blissful months in the hermitage. Before finally ascending the hills to establish their eternal shrine at Tirumala, Lord Venkateswara made a solemn promise: any devotee who is aged, sick, physically incapable, or prevented by circumstance from climbing the Tirumala hills will receive the identical spiritual fulfillment, blessings, and marital harmony by praying before his form at Srinivasa Mangapuram.

Architecturally, the temple is an exquisite monument protected by the Archaeological Survey of India (ASI). It features an expansive granite-paved prakaram, a grand multi-tiered Rajagopuram, and a richly sculpted Kalyana Mandapam with pillars depicting the divine wedding procession, celestial musicians, and guardian deities. The central sanctum enshrines an imposing, beautifully proportioned stone idol of Lord Kalyana Venkateswara with his hands extended in divine blessing.

The temple is widely renowned as a prime sanctuary for praying for marital reconciliation, the removal of marriage obstacles, and the blessing of children. Every year during the annual Brahmotsavam and monthly Kalyanotsavams, thousands of families gather to celebrate the eternal love and grace of the divine couple.`,
  },
  {
    placeName: "Vakula Matha Temple, Peruru",
    title: "The Maternal Gaze of Vakula Devi on Peruru Hill",
    claimType: "legend",
    content: `Crowning the summit of a scenic granite hillock known as Perurubanda in the rural outskirts of Tirupati, the Vakula Matha Temple honors Vakula Devi, the devoted foster mother of Lord Venkateswara. The shrine occupies a uniquely poignant and sacred niche in the religious geography of the region, embodying the unconditional power of maternal affection in Hindu sacred tradition.

According to the classical Puranic chronicle, Yashoda, the foster mother who raised Lord Krishna during his childhood in Gokula, grieved deeply that she was not present to witness any of Krishna's divine royal weddings in Dvapara Yuga. Pleased by her boundless motherly love, Lord Krishna granted her a cosmic boon: she would be reborn in the Kali Yuga as Vakula Devi to raise Srinivasa, arrange his courtship with Goddess Padmavathi, and joyfully witness their celestial marriage.

The historical placement of the temple atop Perurubanda hill was carefully calculated by ancient spiritual architects. From the temple's northern courtyard, Vakula Devi's stone murti gazes across the open plains directly toward the sacred peaks of Tirumala, maintaining an eternal, loving maternal vigil over her divine son's mountain sanctuary.

The temple, having suffered neglect during turbulent historical eras, was recently completely restored and rebuilt by the Tirumala Tirupati Devasthanams using traditional granite stone masonry. Following strict Vaikhanasa Agama canons, skilled temple sculptors constructed a graceful sanctum, a sculpted vimana tower, and a stone circumambulation path surrounded by landscaped hilltop gardens.

A moving ritual custom reflects this eternal bond of maternal love: food offerings prepared at the Tirumala temple are dedicated in spirit to Vakula Matha first, symbolizing that even the Lord of the Universe will not partake of a meal before honoring his mother. Visitors ascending the stone steps of Perurubanda hill experience deep emotional serenity and sweeping views of the surrounding rural landscape.`,
  },
  {
    placeName: "Srivari Mettu",
    title: "The Ancient Stepped Highway of Srivari Mettu",
    claimType: "history",
    content: `Located near Srinivasa Mangapuram on the western slopes of the Seshachalam mountain range, Srivari Mettu is the most ancient recorded pedestrian walking highway leading to the sacred hilltop shrine of Sri Venkateswara. While the eastern Alipiri trail is longer, Srivari Mettu provides a steeper, more direct historical path that has been traversed by saints, emperors, and pilgrims for well over a thousand years.

Historical stone inscriptions and literary texts confirm that this western stone staircase was the preferred royal route utilized by the emperors of the Vijayanagara dynasty. In the early 16th century, Emperor Sri Krishnadevaraya and his royal entourage repeatedly ascended these 2,388 granite steps during his seven historic pilgrimages to Tirumala. The saint-composer Tallapaka Annamacharya also walked this mountain path, singing spontaneous Telugu sankirtanas as he climbed the forested ridges.

The trail spans approximately 2.1 kilometers, ascending steeply through dramatic quartzite rock faces and deep forested ravines. Along the route stand ancient stone resting mandapams (Gali Gopurams) built centuries ago by royal donors, where weary travelers could take shelter from monsoon downpours or rest during hot afternoon treks beneath shaded stone roofs.

In addition to its rich heritage, Srivari Mettu offers an authentic ecological immersion into the virgin dry-deciduous forests of the Seshachalam Biosphere Reserve. Trekkers frequently spot troop monkeys, spotted deer, peacocks, and rare indigenous flora such as the endangered Red Sanders (Pterocarpus santalinus) tree, which grows natively on these rocky slopes.

Today, thousands of devotees climb Srivari Mettu daily with bare feet, lighting camphor upon the stone steps and chanting "Govinda, Govinda" as an act of physical purification and spiritual surrender. The path stands as a living historical highway where modern travelers literally walk in the footsteps of ancient saints and kings.`,
  },
];

/**
 * Main execution function
 */
export const expandAndIngestStories = async () => {
  console.log("=================================================");
  console.log("    UPDATING TEMPLE STORIES WITH RICH CONTENT    ");
  console.log("=================================================");

  // 1. Fetch all places to map by name
  const places = await Place.find({}).lean();
  const placeMap = new Map();
  for (const p of places) {
    placeMap.set(p.name.trim().toLowerCase(), p);
  }

  // 2. Fetch default sources
  const sources = await Source.find({}).lean();
  const defaultSourceId = sources[0]?._id;

  let updatedCount = 0;
  let createdCount = 0;

  for (const storyData of EXPANDED_STORIES) {
    const place = placeMap.get(storyData.placeName.trim().toLowerCase());
    if (!place) {
      console.warn(`[Warning] Place not found for '${storyData.placeName}', skipping.`);
      continue;
    }

    // Check if story already exists by placeId and title or placeId
    let existingStory = await Story.findOne({
      placeId: place._id,
      title: storyData.title,
    });

    if (!existingStory) {
      // Find any story for this place
      existingStory = await Story.findOne({ placeId: place._id });
    }

    if (existingStory) {
      existingStory.title = storyData.title;
      existingStory.content = storyData.content;
      existingStory.claimType = storyData.claimType;
      existingStory.status = "approved";
      await existingStory.save();
      updatedCount++;
      console.log(`[Updated] ${place.name} -> "${storyData.title}" (${storyData.content.length} chars)`);
    } else {
      await Story.create({
        placeId: place._id,
        title: storyData.title,
        content: storyData.content,
        claimType: storyData.claimType,
        sourceIds: [defaultSourceId],
        status: "approved",
      });
      createdCount++;
      console.log(`[Created] ${place.name} -> "${storyData.title}" (${storyData.content.length} chars)`);
    }
  }

  console.log(`\nStories update complete: ${updatedCount} updated, ${createdCount} created.`);

  // 3. Trigger ingestion to chunk, embed via Ollama, and save to Atlas
  console.log("\nStarting vector ingestion for updated stories...");
  const stats = await ingestStories({ force: true, batchSize: 10 });
  console.log("Ingestion stats:", stats);

  return { updatedCount, createdCount, stats };
};

if (process.argv[1]?.endsWith("expandStories.js")) {
  connectDB()
    .then(async () => {
      await expandAndIngestStories();
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Fatal Error]", err);
      await disconnectDB().catch(() => {});
      process.exit(1);
    });
}

export default expandAndIngestStories;
