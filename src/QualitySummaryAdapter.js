

class QualitySummaryAdapter {

    constructor(category, compObj, config) {

        this._category = category;
        this._compObj = compObj;
        this._config = config;
    }

    getData() {

        let qualityTracks = [];

        let outlierDataHash = {};

        //console.log(this._compObj._componentDataHash)

        this._category.contents.forEach(content => {

            //console.log(this._compObj._componentDataHash[content.id])


            let componentResult = this._compObj._componentDataHash[content.id];

            componentResult.filter(x => x.accession === 'quality-1') // sub component will keep only quality-1 since only 1 outlier is presented by a child
                .map(x => x.locations.
                    map(x => x.fragments))
                .forEach(x => x.
                    forEach(x => x.
                        forEach(x => { // through each child outlier

                            if (outlierDataHash[x.start] == undefined) { // x.start keeps the residue number for an outlier
                                outlierDataHash[x.start] = [x.type];
                            } else {
                                let tempList = outlierDataHash[x.start].concat([x.type]);
                                outlierDataHash[x.start] = tempList;
                            }

                        })));

        });


        //console.log(outlierDataHash);

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

            } else if (outlierDataHash[incr].length == 1) {
                feature = {
                    accession: "quality-1", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr] +
                                "<br>" + "Residue " + incr + " (" + this._compObj._pdbSequence.charAt(incr - 1) + ")"
                        }]
                    }],
                    color: this._config["color_code"]["quality-1"]
                };
            } else if (outlierDataHash[incr].length == 2) {
                feature = {
                    accession: "quality-2", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr].join(', ') +
                                "<br>" + "Residue " + incr + " (" + this._compObj._pdbSequence.charAt(incr - 1) + ")"
                        }]
                    }],
                    color: this._config["color_code"]["quality-2"]
                };
            } else {
                feature = {
                    accession: "quality-3", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr].join(', ') +
                                "<br>" + "Residue " + incr + " (" + this._compObj._pdbSequence.charAt(incr - 1) + ")"
                        }]
                    }],
                    color: this._config["color_code"]["quality-3"]
                };
            }
            //data[0].locations[0].fragments.push(fragment);
            //data[0].present = true;
            qualityTracks.push(feature)

        }

        qualityTracks[0].present = true; // always paint quality track

        return qualityTracks;

    }

}

export default QualitySummaryAdapter;