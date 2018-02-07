

class QualityAdapter {

    constructor(component, compObj, config, result) {

        this._component = component;
        this._compObj = compObj;
        this._config = config;
        this._result = result;

    }

    getData() {

        let qualityTracks = [];

        if(this._result == undefined) {
            return  qualityTracks;
        }

        let result = this._result["molecules"];

        let outlierDataHash = {};

        result.filter(x => x.entity_id == this._compObj._entityId)
            .map(x => x.chains)
            .map(x => x.filter(x => x.chain_id === this._compObj._bestChainId)
                .map(x => x.models)
            )
            .forEach(x => {
                x.forEach(x => {
                    x.map(x => x.residues)
                        .forEach(x => {
                            x.forEach(outlierResidue => { // each outlier
                                //console.log(outlierResidue)

                                if(outlierResidue.outlier_types.includes(this._component.key)) {
                                    outlierDataHash[outlierResidue.residue_number] = this._component.key; // set the hash if selected outlier type is present for a particular residue
                                }
                            })
                        })
                })
            });

        
        // process outlier result and create tracks data to display

        for (let incr = 1; incr <= this._compObj._pdbSequenceLength; incr++) {

            let feature = {};

            if (outlierDataHash[incr] == undefined) {
                feature = {
                    accession: "quality-0", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "No validation issue reported for Residue " + incr + " (" +this._compObj._pdbSequence.charAt(incr - 1) +")"
                        }]
                    }],
                    color: this._config["color_code"]["quality-0"]
                };

            } else {
                feature = {
                    accession: "quality-1", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr] +
                                "<br>" + "Residue " + incr + " (" + this._compObj._pdbSequence.charAt(incr - 1) + ")",
                            type: this._component.key // this is used to store type of outlier for summary track to process faster
                        }]
                    }],
                    color: this._config["color_code"]["quality-1"]
                };
            } 
            
            qualityTracks.push(feature)
            
        }

        qualityTracks[0].present = true; // always paint quality track


        return qualityTracks;

    }

}

export default QualityAdapter;