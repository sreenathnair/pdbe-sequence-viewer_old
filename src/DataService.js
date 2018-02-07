class DataService {

    constructor() {
        
        this._constApiUrls = {
            summary: '//www.ebi.ac.uk/pdbe/api/pdb/entry/summary/',
            entities: '//www.ebi.ac.uk/pdbe/api/pdb/entry/entities/',
            modifiedResidues: '//www.ebi.ac.uk/pdbe/api/pdb/entry/modified_AA_or_NA/',
            mutatedResidues: '//www.ebi.ac.uk/pdbe/api/pdb/entry/mutated_AA_or_NA/',
            polymerCoverage: '//www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/',
            polymerCoveragePerChain: '//www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/',
            bindingSites: '//www.ebi.ac.uk/pdbe/api/pdb/entry/binding_sites/',
            mappings: '//www.ebi.ac.uk/pdbe/api/mappings/',
            residueListing: '//www.ebi.ac.uk/pdbe/api/pdb/entry/residue_listing/',
            secStrutures: '//www.ebi.ac.uk/pdbe/api/pdb/entry/secondary_structure/',
            outliers: '//www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/',
            topology: '//www.ebi.ac.uk/pdbe/api/topology/entry/',
            molecules: '//www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/',
            uniProtToPfam: '//www.ebi.ac.uk/pdbe/api/mappings/uniprot_to_pfam/',
            observedResidueRatio: '//www.ebi.ac.uk/pdbe/api/pdb/entry/observed_residues_ratio/',
            edm: '//www.ebi.ac.uk/pdbe/coordinates/files/',
            edm_diff: '//www.ebi.ac.uk/pdbe/coordinates/files/',
            uniprotSegments: '//www.ebi.ac.uk/pdbe/api/mappings/uniprot_segments/',
            residueListingPerChain: '//www.ebi.ac.uk/pdbe/api/pdb/entry/residue_listing/',
            bestStructures: '//www.ebi.ac.uk/pdbe/api/mappings/best_structures/',
            uniProtApiUrl: '//www.uniprot.org/uniprot/',
            pdbUniprotDetails: '//www.ebi.ac.uk/pdbe/entry/pdb/uniprot_details/',
            rfam: '//wwwdev.ebi.ac.uk/pdbe/api/nucleic_mappings/rfam/'

        };
    }

    createPromise(pdbIdArr, apiNameList, bestChainId) {

        var apiUrls = this._constApiUrls;
    
        var promises = apiNameList.map(function (apiUrlKey) {
    
            if (apiUrlKey === 'uniProtApiUrl') {
                return Promise.resolve($.ajax(apiUrls[apiUrlKey] + '?query=accession:' + pdbIdArr[0] + '&columns=id,sequence,entry name,protein names,organism,genes&format=tab&limit=1'));
            } else if (apiUrlKey === 'pdbUniprotDetails' || apiUrlKey === 'mappings' || apiUrlKey === 'uniProtToPfam' || apiUrlKey === 'bestStructures') {
                return Promise.resolve($.ajax(apiUrls[apiUrlKey] + '' + pdbIdArr[0]))
            } else if (apiUrlKey === 'polymerCoveragePerChain' || apiUrlKey === 'topology' || apiUrlKey === 'residueListingPerChain') {
                return Promise.resolve($.ajax(apiUrls[apiUrlKey] + '' + pdbIdArr[0] + '/chain/' + bestChainId))
            } else if (apiUrlKey === 'edm') {
                return Promise.resolve($.ajax({
                    url: apiUrls[apiUrlKey] + '' + pdbIdArr[0] + '.ccp4',
                    method: 'GET',
                    responseType: "blob",
                    cache: true
                }))
            } else if (apiUrlKey === 'edm_diff') {
                return Promise.resolve($.ajax({
                    url: apiUrls[apiUrlKey] + '' + pdbIdArr[0] + '_diff.ccp4',
                    method: 'GET',
                    responseType: "blob",
                    cache: true
                }))
            } else if (apiUrlKey === 'uniprotSegments') {
                var totalPdbIds = pdbIdArr.length;
                var bulkPromise = []
                for (var pi = 0; pi < totalPdbIds; pi++) {
                    bulkPromise.push(Promise.resolve($.ajax(apiUrls[apiUrlKey] + '' + pdbIdArr[pi])));
                }
                return bulkPromise;
            } else if (apiUrlKey == 'residueListing' || apiUrlKey === 'rfam'){
                return Promise.resolve($.ajax(apiUrls[apiUrlKey] +pdbIdArr.join(',')));
            } else {
                return Promise.resolve($.ajax({
                    method: 'POST',
                    url: apiUrls[apiUrlKey],
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    data: pdbIdArr.join(',')
                }));
            }
    
        });
    
        return promises;
    
    }

    createMultiPromise(pdbIdArr, apiNameList, bestChainId) {

        var apiUrls = this.apiUrls;
    
        var promises = pdbIdArr.map(function (pdbId) {
    
            return Promise.resolve($.ajax(apiUrls[apiNameList[0]] + '' + pdbId))
    
        });
    
        return promises;
    
    }

    combinedDataGrabber (arrayOfPromises, pdbIdList, apiNameList, postprocess) {
        // For each promise that resolves or rejects, 
        // make them all resolve.
        // Record which ones did resolve or reject
        var resolvingPromises = arrayOfPromises.map(function (promise) {
            return promise.then(function (result) {
                return {
                    resolve: true,
                    result: result
                };
            }, function (error) {
                return {
                    resolve: false,
                    result: error
                };
            });
        });
    
        
    
        return Promise.all(resolvingPromises).then(function (results) {
            // Count how many passed/failed
            var passed = [], failed = [], allFailed = true;
            results.forEach(function (result) {
                if (result.resolve) {
                    allFailed = false;
                }
                passed.push(result.resolve ? result.result : null);
                failed.push(result.resolve ? null : result.result);
            });
    
            if (allFailed) {
                throw failed;
            } else {
                //console.log('all passed')
                if (typeof postprocess == 'undefined' || !postprocess) {
                    return passed;
                } else {
                    //console.log('postprocess true')
                    //Formatting the combined ajax result
                    var finalReturnResult = {};
                    Array.from(passed).forEach(function (passedResult, passkey) {
                        //console.log(passedResult)
                        //console.log(passkey)
                        if (passedResult !== null && typeof passedResult !== 'undefined') {
                            
                            if (typeof passedResult[pdbIdList] !== 'undefined' && passedResult[pdbIdList]) {
                                //console.log('inside again')
                                Array.from(passedResult[pdbIdList]).forEach(function (passedResultData, passResultPdbId) {
                                    //console.log(passedResultData)
                                    //console.log(passResultPdbId)
                                    var resultData = '';
                                    if (typeof passedResultData !== 'undefined' && passedResultData) {
                                        resultData = passedResultData;
                                    }
                                    
                                    if (typeof finalReturnResult[passResultPdbId] == 'undefined') {
                                        finalReturnResult[passResultPdbId] = {};
                                    }
    
                                    var resApiName = apiNameList[passkey] != undefined ? apiNameList[passkey] : apiNameList[0];
                                    finalReturnResult[passResultPdbId][resApiName] = resultData;
    
                                });
    
                            }
                        }
    
                    });
    
                    return finalReturnResult;
                }
            }
        });
    
    }

    combineData(arrayOfPromises, pdbId, apiNameList) {
    
        // For each promise that resolves or rejects, 
        // make them all resolve.
        // Record which ones did resolve or reject
        var resolvingPromises = arrayOfPromises.map(function (promise) {
            return promise.then(function (result) {
                return {
                    resolve: true,
                    result: result
                };
            }, function (error) {
                return {
                    resolve: false,
                    result: error
                };
            });
        });
    
        var finalData = {};
    
        return Promise.all(resolvingPromises).then(function(results){
    
            finalData[pdbId] = {};
            let incr = 0;
            results.forEach(element => {
                finalData[pdbId][apiNameList[incr++]] = element;
            });
            return finalData;
        });
        
    
    }
    
    //Sort the mapping array to get paths in proper order              
    sortMappingFragments(property) {
        var sortOrder = 1;
        if (property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }
    
    checkUniportGapProbability (mappingData) {
        var probability = false;
        var totalmappings = mappingData.length;
        for (var mi = 0; mi < totalmappings; mi++) {
            var uniprotFargmentLength = mappingData[mi].unp_end - mappingData[mi].unp_start;
            var pdbFargmentLength = mappingData[mi].end.residue_number - mappingData[mi].start.residue_number;
            var uniportPositiveLength = uniprotFargmentLength > 0 ? uniprotFargmentLength : -uniprotFargmentLength;
            var pdbPositiveLength = pdbFargmentLength > 0 ? pdbFargmentLength : -pdbFargmentLength;
    
            if (uniportPositiveLength != pdbPositiveLength) {
                probability = true;
                break;
            }
    
        }
    
        return probability;
    }  

}

export default DataService;