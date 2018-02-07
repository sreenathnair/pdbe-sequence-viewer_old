

class DomainsAdapter {

    constructor(component, compObj, config, result) {
        this._component = component;
        this._compObj = compObj;
        this._config = config;
        this._result = result;

    }

    getData() {


        let data = [];

        if(this._result == undefined) {
            return data;
        }

        let result = this._result[this._component.key];

        

        Object.keys(result).forEach(domain => {

            //console.log(result[domain])

            let filtered = result[domain].mappings.filter(x => x.chain_id === this._compObj._bestChainId);
            
            if (filtered.length != 0) {

                //console.log('yes')
                let feature = {
                    accession: result[domain].identifier,
                    locations: [{
                        fragments: []
                    }],
                    color: this._config["color_code"][this._component.id],
                    present: true,
                    //start: 0, uncomment for text label
                    //end: 0 uncomment for text label

                }

                filtered.forEach(dom => {

                    //feature.start = dom.start.residue_number; uncomment for text label
                    //feature.end = dom.end.residue_number; uncomment for text label

                    let uniprotTooltip = "";

                    // add UniProt details to tool tip if applicable

                    if (this._component.id === 'uniprot') {
                        uniprotTooltip = "UniProt range: " + dom.unp_start + " - " + dom.unp_end + "<br>";
                    }

                    let fragment = {
                        start: dom.start.residue_number,
                        end: dom.end.residue_number,
                        toolTip: "Residue {resNum}  ({charAtResNum})" +
                            "<br><b>" + domain + "</b><br>" +
                            result[domain].identifier + "<br>" +
                            uniprotTooltip +
                            "PDB range: " + dom.start.residue_number + " - " +
                            dom.end.residue_number + " (Chain " + dom.chain_id + ")"
                    }

                    //console.log('fragment', fragment);

                    feature.locations[0].fragments.push(fragment);


                });

                //filtered = filtered.reduce((x, y) => x.concat(y));
                //console.log(domain, filtered)

                data.push(feature);

            }


        });

        return data;

    }

}

export default DomainsAdapter;