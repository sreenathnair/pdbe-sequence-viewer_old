

class DomainsAdapter {

    constructor(component, compObj, config, result) {
        this._component = component;
        this._compObj = compObj;
        this._config = config;
        this._result = result;

        console.log("Init Domains Adapter", component.label);
    }

    getData() {

        let data = [{
            accession: this._component.id,
            locations: [{
                fragments: []
            }],
            color: this._config["color_code"][this._component.id],
            present: false
        }];

        let result = this._result[this._component.key];

        Object.keys(this._result[this._component.key]).forEach(domain => {


            result[domain].mappings.filter(x => x.chain_id === this._compObj._bestChainId)
                .forEach(map => {

                    for (let incr = map.start.residue_number; incr <= map.end.residue_number; incr++) {
                        
                        let uniprotTooltip = "";

                        // add UniProt details to tool tip if applicable

                        if (this._component.id === 'uniprot') {
                            uniprotTooltip = "UniProt range: " + map.unp_start + " - " + map.unp_end + "<br>";
                        }

                        let fragment = {
                            start: incr,
                            end: incr,
                            toolTip: "Residue " + incr + " (" + this._compObj._pdbSequence.charAt(incr) + ")" +
                                "<br><b>" + domain + "</b><br>" +
                                result[domain].identifier + "<br>" +
                                uniprotTooltip +
                                "PDB range: " + map.start.residue_number + " - " +
                                map.end.residue_number + " (Chain " + map.chain_id + ")"
                        }

                        data[0].locations[0].fragments.push(fragment);
                        data[0].present = true;
                    }


                });



        });
        
        return data;

    }

}

export default DomainsAdapter;